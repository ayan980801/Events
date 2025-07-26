import asyncio
import json
import logging
import re
import time
import traceback
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from functools import wraps
from threading import Lock
from typing import Any, Dict, List, Optional, Set
import snowflake.connector
from bson import json_util
from motor.motor_asyncio import AsyncIOMotorClient
from pyspark.sql import DataFrame, SparkSession
from pyspark.sql.functions import (
    coalesce, col, current_timestamp, current_user,
    from_json, lit, regexp_replace, struct, to_json, when, udf
)
from pyspark.sql.types import (
    BooleanType, DataType, DateType, DoubleType, FloatType, IntegerType,
    LongType, MapType, StringType, TimestampType, StructType, StructField
)
from pyspark.storagelevel import StorageLevel
from pymongo.errors import PyMongoError
from snowflake.connector.errors import Error as SnowflakeError
from tenacity import retry, stop_after_attempt, wait_exponential
import nest_asyncio

# Apply Nested Event Loop Patch
nest_asyncio.apply()

# ------------------ USER CONFIG ------------------
collections = ["events"]      # List of MongoDB collections to process
batch_size = 100000           # MongoDB batch size (large but fits memory)
test_mode = False             # Production mode
test_limit = 1000             # Only used if test_mode=True
threads = 14                  # Use all available executor cores for concurrency
suffix = "WITH_DUPES2"        # Output identifier
log_level = "INFO"            # Logging level
# -------------------------------------------------

# Configure logging
logging.basicConfig(
    level=getattr(logging, log_level),
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)

class FlatteningError(Exception):
    pass

@dataclass
class Config:
    def __init__(
        self, spark: SparkSession, collections, batch_size, test_mode, test_limit, threads, suffix
    ):
        # MongoDB config (secret from Key Vault)
        self.mongo_connection_string = dbutils.secrets.get(
            scope="key-vault-secret", key="mongo-connection-string-events"
        )
        self.mongo_database = "lead_events"
        
        # Snowflake config (from Key Vault)
        self.sf_user = dbutils.secrets.get(scope="key-vault-secret", key="DataProduct-SF-EDW-User")
        self.sf_password = dbutils.secrets.get(scope="key-vault-secret", key="DataProduct-SF-EDW-Pass")
        self.sf_account = "hmkovlx-nu26765"
        self.sf_warehouse = "INTEGRATION_COMPUTE_WH"
        self.sf_database = "DEV"
        self.sf_schema = "QUILITY_EDW_STAGE"
        self.sf_role = "SG-SNOWFLAKE-DEVELOPERS"

        # ADLS config (hardcoded path)
        self.adls_base_path = (
            "abfss://dataarchitecture@quilitydatabricks.dfs.core.windows.net/RAW/leadEvents/"
        )

        # Runtime config
        self.batch_size = batch_size
        self.test_mode = test_mode
        self.test_record_limit = test_limit if test_mode else 0
        self.collections = collections
        self.thread_pool_size = threads
        self.duplicate_suffix = suffix

        # Cluster-aware logic (single-node tuned)
        # On single-node clusters, executor.instances is typically "1" or not set
        try:
            self.num_executors = int(spark.conf.get("spark.executor.instances", "1"))
        except Exception:
            self.num_executors = 1
        try:
            # For your cluster, this should be 14 (see config)
            self.executor_cores = int(spark.conf.get("spark.executor.cores", "14"))
        except Exception:
            self.executor_cores = 14  # safe fallback for your current config

        if self.num_executors == 1:
            self.optimal_partitions = max(2, self.executor_cores * 2)
        else:
            # For multi-node, classic approach
            self.optimal_partitions = self.num_executors * self.executor_cores * 2


class ThreadSafeSchemaTracker:
    def __init__(self):
        self.all_fields: Set[str] = set()
        self.batch_schemas: Dict[str, Set[str]] = {}
        self.batch_count = 0
        self._lock = Lock()
    def add_batch_schema(self, fields: Set[str]) -> None:
        with self._lock:
            self.batch_count += 1
            batch_key = f"batch_{self.batch_count}"
            self.batch_schemas[batch_key] = fields
            self.all_fields.update(fields)
    def get_unified_schema(self) -> Set[str]:
        with self._lock:
            return self.all_fields.copy()

def monitor_performance(func):
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        logger.info(f"Function '{func.__name__}' started")
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            elapsed = time.time() - start_time
            logger.info(f"Function '{func.__name__}' completed in {elapsed:.2f}s")
            return result
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"Function '{func.__name__}' failed after {elapsed:.2f}s: {str(e)}")
            raise
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        logger.info(f"Function '{func.__name__}' started")
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            elapsed = time.time() - start_time
            logger.info(f"Function '{func.__name__}' completed in {elapsed:.2f}s")
            return result
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"Function '{func.__name__}' failed after {elapsed:.2f}s: {str(e)}")
            raise
    return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

def flatten_json(data: Any, parent_key: str = "", sep: str = "_") -> Dict[str, Any]:
    items = []
    path_counts = {}
    def get_unique_key(key: str) -> str:
        if key in path_counts:
            path_counts[key] += 1
            return f"{key}_{path_counts[key]}"
        path_counts[key] = 0
        return key
    def sanitize_key(key: str) -> str:
        key = re.sub(r"[^0-9a-zA-Z_]", "_", key)
        if re.match(r"^\d", key):
            key = f"COL_{key}"
        return key.upper()
    if isinstance(data, dict):
        for k, v in data.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            new_key = sanitize_key(new_key)
            if isinstance(v, (dict, list)):
                items.extend(flatten_json(v, new_key, sep).items())
            else:
                final_key = get_unique_key(new_key)
                items.append((final_key, v))
    elif isinstance(data, list):
        for i, v in enumerate(data):
            new_key = f"{parent_key}{sep}{i}" if parent_key else str(i)
            new_key = sanitize_key(new_key)
            if isinstance(v, (dict, list)):
                items.extend(flatten_json(v, new_key, sep).items())
            else:
                final_key = get_unique_key(new_key)
                items.append((final_key, v))
    else:
        final_key = get_unique_key(sanitize_key(parent_key))
        items.append((final_key, data))
    return dict(items)

class DataIntegrator:
    def __init__(self, spark: SparkSession, config: Config):
        self.spark = spark
        self.config = config
        self.schema_tracker = ThreadSafeSchemaTracker()
        self._mongo_client = None
        self._snowflake_pool = []
        self._pool_lock = Lock()
        # Optimize Spark config
        spark.conf.set("spark.databricks.delta.optimizeWrite.enabled", "true")
        spark.conf.set("spark.databricks.delta.autoCompact.enabled", "true")
        spark.conf.set("spark.sql.adaptive.enabled", "true")
        spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
    @property
    def mongo_client(self):
        if self._mongo_client is None:
            self._mongo_client = AsyncIOMotorClient(self.config.mongo_connection_string)
        return self._mongo_client
    def get_snowflake_connection(self):
        with self._pool_lock:
            if self._snowflake_pool:
                return self._snowflake_pool.pop()
        return snowflake.connector.connect(
            user=self.config.sf_user,
            password=self.config.sf_password,
            account=self.config.sf_account,
            warehouse=self.config.sf_warehouse,
            role=self.config.sf_role,
            database=self.config.sf_database,
            schema=self.config.sf_schema,
        )
    def return_snowflake_connection(self, conn):
        with self._pool_lock:
            if len(self._snowflake_pool) < 5:
                self._snowflake_pool.append(conn)
            else:
                conn.close()
    def close_connections(self):
        if self._mongo_client:
            self._mongo_client.close()
        with self._pool_lock:
            for conn in self._snowflake_pool:
                conn.close()
            self._snowflake_pool.clear()
    
    def create_dataframe_from_documents(self, documents: List[Dict]) -> DataFrame:
        """Safely create DataFrame from MongoDB documents by converting to JSON strings first"""
        # Convert documents to JSON strings to avoid schema conflicts
        json_strings = []
        for doc in documents:
            try:
                # Use json_util to properly serialize MongoDB types
                json_str = json_util.dumps(doc)
                json_strings.append(json_str)
            except Exception as e:
                logger.warning(f"Failed to serialize document: {e}")
                # Skip problematic documents
                continue
        
        if not json_strings:
            # Create empty DataFrame with expected schema
            empty_schema = StructType([StructField("json_string", StringType(), True)])
            return self.spark.createDataFrame([], empty_schema)
        
        # Create DataFrame with single string column
        df = self.spark.createDataFrame([(js,) for js in json_strings], ["json_string"])
        
        # Parse JSON strings back to structured data
        # This avoids schema inference conflicts
        df_parsed = df.select(
            from_json(col("json_string"), MapType(StringType(), StringType())).alias("data")
        ).select(to_json(col("data")).alias("json_data"))
        
        return df_parsed
    
    @monitor_performance
    def flatten_dataframe(self, df: DataFrame) -> DataFrame:
        logger.info("Flattening DataFrame using native operations")
        
        # If DataFrame already has json_data column, use it directly
        if "json_data" in df.columns:
            json_df = df.select(col("json_data"))
        else:
            # Convert to JSON if not already
            json_df = df.select(to_json(struct(*df.columns)).alias("json_data"))
        
        def flatten_json_udf_py(json_str: str) -> str:
            try:
                if json_str is None:
                    return "{}"
                data = json.loads(json_str)
                flattened = flatten_json(data)
                return json.dumps(flattened)
            except Exception as e:
                logger.error(f"Flattening error: {str(e)}")
                return json_str if json_str else "{}"
        
        flatten_json_udf = udf(flatten_json_udf_py, StringType())
        flattened_df = json_df.select(
            col("json_data").alias("full_json_payload"),
            flatten_json_udf(col("json_data")).alias("flattened"),
        )
        
        # Use the correct StorageLevel constant
        flattened_df.persist(StorageLevel.MEMORY_AND_DISK)
        
        return flattened_df
    
    def collect_all_fields(self, df: DataFrame) -> Set[str]:
        """Collect all unique field names from the flattened data"""
        try:
            df_with_map = df.select(
                from_json(col("flattened"), MapType(StringType(), StringType())).alias("data")
            )
            
            # Filter out null data before collecting keys
            keys_df = df_with_map.filter(col("data").isNotNull()).select("data").rdd.flatMap(
                lambda row: list(row.data.keys()) if row.data else []
            ).distinct().collect()
            
            batch_fields = set(keys_df)
            self.schema_tracker.add_batch_schema(batch_fields)
            return self.schema_tracker.get_unified_schema()
        except Exception as e:
            logger.error(f"Error collecting fields: {str(e)}")
            # Return existing fields if collection fails
            return self.schema_tracker.get_unified_schema()
    
    @monitor_performance
    def process_batch_with_schema(self, df: DataFrame, all_fields: Set[str]) -> DataFrame:
        logger.info(f"Processing batch with {len(all_fields)} fields")
        
        if not all_fields:
            logger.warning("No fields to process, returning DataFrame with only full_json_payload")
            return df.select(col("full_json_payload"))
        
        sanitized_map = {}
        name_counts = {}
        for field in sorted(all_fields):
            sanitized = self._sanitize_column_name(field)
            if sanitized in name_counts:
                count = name_counts[sanitized] + 1
                name_counts[sanitized] = count
                unique_name = f"{sanitized}_{count}"
                sanitized_map[field] = unique_name
            else:
                name_counts[sanitized] = 1
                sanitized_map[field] = sanitized
        
        df_parsed = df.select(
            from_json(col("flattened"), MapType(StringType(), StringType())).alias("data_map"),
            col("full_json_payload"),
        )
        
        select_cols = [col("full_json_payload")]
        for field in sorted(all_fields):
            sanitized_name = sanitized_map[field]
            select_cols.append(
                coalesce(col("data_map").getItem(field), lit(None)).alias(sanitized_name)
            )
        
        processed_df = df_parsed.select(*select_cols)
        
        # Unpersist the original DataFrame to free memory
        try:
            df.unpersist()
        except Exception as e:
            logger.debug(f"Could not unpersist DataFrame: {str(e)}")
        
        return processed_df
    
    def _sanitize_column_name(self, column_name: str) -> str:
        column_name = re.sub(r"[^0-9a-zA-Z_]", "_", column_name)
        if re.match(r"^\d", column_name):
            column_name = f"COL_{column_name}"
        return column_name.upper()
    
    def _infer_and_cast_types(self, df: DataFrame) -> DataFrame:
        logger.info("Inferring and casting column types")
        for field in df.schema.fields:
            if field.name in ["FULL_JSON_PAYLOAD", "ETL_CREATED_DATE",
                              "ETL_LAST_UPDATE_DATE", "CREATED_BY",
                              "TO_PROCESS", "EDW_EXTERNAL_SOURCE_SYSTEM"]:
                continue
            col_name = field.name
            
            # Cast boolean values
            df = df.withColumn(
                col_name,
                when(col(col_name).isin("true", "True", "TRUE", "1", "yes", "Yes"), True)
                .when(col(col_name).isin("false", "False", "FALSE", "0", "no", "No"), False)
                .otherwise(col(col_name))
            )
            
            # Cast numeric values
            cleaned_numeric = regexp_replace(col(col_name), r"[^0-9.\-]", "")
            df = df.withColumn(
                col_name,
                when(cleaned_numeric.rlike(r"^-?\d+\.?\d*$"), cleaned_numeric.cast(DoubleType()))
                .otherwise(col(col_name))
            )
        return df
    
    def _add_metadata_columns(self, df: DataFrame) -> DataFrame:
        return (
            df.withColumn("ETL_CREATED_DATE", current_timestamp())
            .withColumn("ETL_LAST_UPDATE_DATE", current_timestamp())
            .withColumn("CREATED_BY", current_user())
            .withColumn("TO_PROCESS", lit(True))
            .withColumn("EDW_EXTERNAL_SOURCE_SYSTEM", lit("LeadEvents"))
        )
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def _write_to_adls(self, df: DataFrame, collection_name: str) -> None:
        try:
            adls_path = f"{self.config.adls_base_path}/{self.config.duplicate_suffix}/{collection_name}"
            logger.info(f"Writing to ADLS: {adls_path}")
            
            # Repartition for optimal write performance
            df_repartitioned = df.repartition(self.config.optimal_partitions)
            
            df_repartitioned.write.format("delta").mode("overwrite").option(
                "overwriteSchema", "true"
            ).option("mergeSchema", "true").save(adls_path)
            
            logger.info(f"Successfully wrote to ADLS: {adls_path}")
        except Exception as e:
            logger.error(f"Error writing to ADLS: {str(e)}")
            raise
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def _write_to_snowflake(self, df: DataFrame, collection_name: str) -> None:
        conn = None
        try:
            table_name = f"STG_LEAD_{collection_name}_{self.config.duplicate_suffix}".upper()
            logger.info(f"Writing to Snowflake table: {table_name}")
            
            conn = self.get_snowflake_connection()
            with conn.cursor() as cursor:
                # Create table if not exists
                create_sql = f"""
                CREATE TABLE IF NOT EXISTS {table_name} (
                    ETL_CREATED_DATE TIMESTAMP_NTZ(9) DEFAULT CURRENT_TIMESTAMP,
                    ETL_LAST_UPDATE_DATE TIMESTAMP_NTZ(9) DEFAULT CURRENT_TIMESTAMP,
                    CREATED_BY VARCHAR(16777216) DEFAULT CURRENT_USER(),
                    TO_PROCESS BOOLEAN NOT NULL DEFAULT TRUE,
                    EDW_EXTERNAL_SOURCE_SYSTEM VARCHAR(16777216) DEFAULT 'LeadEvents',
                    FULL_JSON_PAYLOAD VARIANT
                )
                """
                cursor.execute(create_sql)
                
                # Get existing columns
                cursor.execute(
                    f"""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = '{table_name}'
                    AND table_schema = '{self.config.sf_schema.upper()}'
                    """
                )
                existing_cols = {row[0].upper() for row in cursor.fetchall()}
                
                # Add any missing columns
                for field in df.schema.fields:
                    col_name = field.name.upper()
                    if col_name not in existing_cols:
                        col_type = self._get_snowflake_column_type(field.dataType)
                        alter_sql = f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"
                        cursor.execute(alter_sql)
                        logger.info(f"Added column {col_name} to {table_name}")
            
            # Write data to Snowflake
            sf_options = {
                "sfURL": f"{self.config.sf_account}.snowflakecomputing.com",
                "sfUser": self.config.sf_user,
                "sfPassword": self.config.sf_password,
                "sfDatabase": self.config.sf_database,
                "sfSchema": self.config.sf_schema,
                "sfWarehouse": self.config.sf_warehouse,
                "sfRole": self.config.sf_role,
                "dbtable": table_name,
            }
            
            df.write.format("snowflake").options(**sf_options).mode("overwrite").save()
            logger.info(f"Successfully wrote to Snowflake table: {table_name}")
        except SnowflakeError as e:
            logger.error(f"Snowflake error: {str(e)}")
            raise
        finally:
            if conn:
                self.return_snowflake_connection(conn)
    
    def _get_snowflake_column_type(self, spark_type: DataType) -> str:
        type_mapping = {
            StringType: "VARCHAR",
            IntegerType: "INTEGER",
            LongType: "BIGINT",
            FloatType: "FLOAT",
            DoubleType: "DOUBLE",
            BooleanType: "BOOLEAN",
            TimestampType: "TIMESTAMP_NTZ",
            DateType: "DATE",
        }
        for spark_class, sf_type in type_mapping.items():
            if isinstance(spark_type, spark_class):
                return sf_type
        return "VARCHAR"
    
    @monitor_performance
    async def read_mongodb_collection(self, collection_name: str) -> None:
        logger.info(f"Reading MongoDB collection: {collection_name}")
        try:
            db = self.mongo_client[self.config.mongo_database]
            collection = db[collection_name]
            
            if self.config.test_mode:
                logger.info(f"TEST MODE: Processing {self.config.test_record_limit} records")
                cursor = collection.find().limit(self.config.test_record_limit)
                documents = await cursor.to_list(length=self.config.test_record_limit)
                
                if not documents:
                    logger.warning(f"No documents found in {collection_name}")
                    return
                
                df = self.create_dataframe_from_documents(documents)
                if df.rdd.isEmpty():
                    logger.warning(f"No valid documents to process in {collection_name}")
                    return
                
                df_flattened = self.flatten_dataframe(df)
                all_fields = self.collect_all_fields(df_flattened)
                df_processed = self.process_batch_with_schema(df_flattened, all_fields)
                df_final = self._infer_and_cast_types(df_processed)
                df_final = self._add_metadata_columns(df_final)
                
                self._write_to_adls(df_final, collection_name)
                self._write_to_snowflake(df_final, collection_name)
            else:
                # Full processing mode
                total_docs = await collection.count_documents({})
                logger.info(f"Processing {total_docs} documents from {collection_name}")
                
                if total_docs == 0:
                    logger.warning(f"No documents found in {collection_name}")
                    return
                
                last_id = None
                batch_num = 0
                all_batches = []
                
                with ThreadPoolExecutor(max_workers=self.config.thread_pool_size) as executor:
                    while True:
                        query = {"_id": {"$gt": last_id}} if last_id else {}
                        cursor = collection.find(query).sort("_id", 1).limit(self.config.batch_size)
                        batch = await cursor.to_list(length=self.config.batch_size)
                        
                        if not batch:
                            break
                        
                        batch_num += 1
                        logger.info(f"Processing batch {batch_num} ({len(batch)} docs)")
                        
                        # Process batch in thread pool
                        loop = asyncio.get_event_loop()
                        df_flattened = await loop.run_in_executor(
                            executor, self._process_batch_sync, batch
                        )
                        
                        if df_flattened is not None and not df_flattened.rdd.isEmpty():
                            self.collect_all_fields(df_flattened)
                            all_batches.append(df_flattened)
                        else:
                            logger.warning(f"Batch {batch_num} produced no valid data")
                        
                        last_id = batch[-1]["_id"]
                
                if not all_batches:
                    logger.warning(f"No valid batches to process for {collection_name}")
                    return
                
                # Process all batches with unified schema
                final_fields = self.schema_tracker.get_unified_schema()
                logger.info(f"Processing {len(all_batches)} batches with {len(final_fields)} fields")
                
                processed_batches = []
                for i, df_batch in enumerate(all_batches, 1):
                    logger.info(f"Processing batch {i}/{len(all_batches)}")
                    df_processed = self.process_batch_with_schema(df_batch, final_fields)
                    df_inferred = self._infer_and_cast_types(df_processed)
                    processed_batches.append(df_inferred)
                
                # Merge all batches
                logger.info("Merging all batches")
                df_merged = processed_batches[0]
                for df_batch in processed_batches[1:]:
                    df_merged = df_merged.unionByName(df_batch, allowMissingColumns=True)
                
                # Add metadata and write
                df_final = self._add_metadata_columns(df_merged)
                self._write_to_adls(df_final, collection_name)
                self._write_to_snowflake(df_final, collection_name)
                
                logger.info(f"Completed processing {collection_name}")
                
        except PyMongoError as e:
            logger.error(f"MongoDB error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            logger.debug(traceback.format_exc())
            raise
    
    def _process_batch_sync(self, batch: List[Dict]) -> Optional[DataFrame]:
        """Process a batch synchronously in thread pool"""
        try:
            df = self.create_dataframe_from_documents(batch)
            if df.rdd.isEmpty():
                logger.warning("Created DataFrame is empty")
                return None
            return self.flatten_dataframe(df)
        except Exception as e:
            logger.error(f"Error processing batch: {str(e)}")
            logger.debug(traceback.format_exc())
            return None
    
    @monitor_performance
    async def run_integration(self) -> None:
        logger.info(f"Starting integration for collections: {self.config.collections}")
        tasks = [
            self.read_mongodb_collection(collection)
            for collection in self.config.collections
        ]
        await asyncio.gather(*tasks)
        logger.info("Integration completed successfully")

async def main():
    spark = SparkSession.builder.appName("DataIntegrator").getOrCreate()
    config = Config(
        spark=spark,
        collections=collections,
        batch_size=batch_size,
        test_mode=test_mode,
        test_limit=test_limit,
        threads=threads,
        suffix=suffix,
    )
    integrator = DataIntegrator(spark, config)
    try:
        await integrator.run_integration()
    finally:
        integrator.close_connections()
        # spark.stop()

await main()
