from __future__ import annotations
import asyncio
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, MutableMapping, Optional, Sequence, Set, Tuple
import snowflake.connector
from bson import json_util
from motor.motor_asyncio import AsyncIOMotorClient
from pyspark.sql import DataFrame, SparkSession
from pyspark.sql.functions import (
    col,
    current_timestamp,
    current_user,
    expr,
    lit,
)
from pyspark.sql.types import (
    BooleanType,
    DoubleType,
    IntegerType,
    StringType,
    StructType,
    ArrayType,
    TimestampType,
)
from pyspark.storagelevel import StorageLevel
import nest_asyncio

# Nested Event Loop Integration
nest_asyncio.apply()

# ───────────────────────── logger & Spark session ───────────────────────── #

LOG_FMT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FMT)
log: logging.Logger = logging.getLogger("LeadEventsETL")

spark: SparkSession = (
    SparkSession.builder.appName("LeadEventsETL")
    .config("spark.sql.adaptive.enabled", "true")
    .config("spark.sql.adaptive.coalescePartitions.enabled", "true")
    .config("spark.sql.caseSensitive", "true")  # distinct Age vs AGE vs age
    .getOrCreate()
)
log.info("Spark %s initialised", spark.version)

# ───────────────────────────── helper functions ───────────────────────────── #

# Insert underscores before an uppercase letter only when the preceding
# character is lowercase or a digit. This avoids splitting sequences of
# capital letters like "UUID" into "U_U_I_D" while still converting camelCase
# to snake_case-friendly names.
_CAMEL = re.compile(r"(?<=[a-z0-9])(?=[A-Z])")
_NONALNUM = re.compile(r"[^0-9a-zA-Z_]")

def _safe_name(raw: str) -> str:
    name = _NONALNUM.sub("_", raw or "")
    name = _CAMEL.sub("_", name).upper().strip("_")
    name = re.sub(r"_+", "_", name)
    if not name:
        name = "BLANK"
    if name[0].isdigit():
        name = f"COL_{name}"
    return name

def _unique(name: str, registry: MutableMapping[str, int]) -> str:
    key = name.upper()
    if key not in registry:
        registry[key] = 0
        return name
    registry[key] += 1
    return f"{name}_{registry[key]}"

def _monitor(fn):
    async def _async(*a, **kw):
        t0 = time.perf_counter()
        log.info("▶ %s", fn.__qualname__)
        try:
            return await fn(*a, **kw)
        finally:
            log.info("⏱  %.2fs ← %s", time.perf_counter() - t0, fn.__qualname__)

    def _sync(*a, **kw):
        t0 = time.perf_counter()
        log.info("▶ %s", fn.__qualname__)
        try:
            return fn(*a, **kw)
        finally:
            log.info("⏱  %.2fs ← %s", time.perf_counter() - t0, fn.__qualname__)

    return _async if asyncio.iscoroutinefunction(fn) else _sync

# ──────────────────────────────── configuration ──────────────────────────────── #

def _maybe_dbutils():
    try:
        from pyspark.dbutils import DBUtils  # type: ignore
        return DBUtils(spark)
    except Exception:
        return None

_dbutils = _maybe_dbutils()

@dataclass(slots=True)
class Config:
    collections: Sequence[str]
    batch_size: int = 100_000
    test_mode: bool = False
    test_limit: Optional[int] = None

    # Snowflake (non‑secret)
    sf_account: str = "hmkovlx-nu26765"
    sf_db: str = "DEV"
    sf_schema: str = "QUILITY_EDW_STAGE"
    sf_wh: str = "INTEGRATION_COMPUTE_WH"
    sf_role: str = "SG-SNOWFLAKE-DEVELOPERS"

    adls: str = (
        "abfss://dataarchitecture@quilitydatabricks.dfs.core.windows.net/RAW/leadEvents/"
    )

    # secret scope/key names
    _scope: str = "key-vault-secret"
    _mongo_key: str = "mongo-connection-string-events"
    _sf_user_key: str = "DataProduct-SF-EDW-User"
    _sf_pw_key: str = "DataProduct-SF-EDW-Pass"

    _cache: MutableMapping[str, str] = field(default_factory=dict, init=False)

    def __post_init__(self) -> None:
        if not self.collections:
            raise ValueError("At least one collection is required")
        if self.batch_size <= 0:
            raise ValueError("batch_size must be positive")

    def _secret(self, key: str, env: str) -> str:
        if key in self._cache:
            return self._cache[key]
        val = ""
        if _dbutils:
            try:
                val = _dbutils.secrets.get(self._scope, key)  # type: ignore[arg-type]
            except Exception as exc:
                log.warning("dbutils.secrets.get(%s/%s) failed: %s", self._scope, key, exc)
        if not val:
            val = os.getenv(env, "")
        if not val:
            log.warning("Secret %s missing (and env var %s empty)", key, env)
        self._cache[key] = val
        return val

    @property
    def mongo_uri(self) -> str:
        return self._secret(self._mongo_key, "MONGO_CONNECTION_STRING_EVENTS")

    @property
    def sf_user(self) -> str:
        return self._secret(self._sf_user_key, "DATAPRODUCT_SF_EDW_USER")

    @property
    def sf_pw(self) -> str:
        return self._secret(self._sf_pw_key, "DATAPRODUCT_SF_EDW_PASS")

# ──────────────────────────────── integrator ──────────────────────────────── #

_TYPE_RULES: Dict[Tuple[str, ...], Any] = {
    ("_COUNT", "_SCORE", "_NUMBER", "_ID"): IntegerType(),
    ("_DATE", "_TIME", "_TIMESTAMP", "_CREATED", "_UPDATED"): TimestampType(),
    ("_AMOUNT", "_PRICE", "_VALUE", "_RATE"): DoubleType(),
    ("_FLAG", "_ENABLED", "_ACTIVE", "_PROCESS"): BooleanType(),
}

class DataIntegrator:
    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg
        self.batch_no = 0
        self.mongo = AsyncIOMotorClient(cfg.mongo_uri)
        self.sf_pool: List[snowflake.connector.SnowflakeConnection] = []
        self.global_schema: Set[str] = set()

    # ------------- connection helpers -------------

    def _sf_conn(self) -> snowflake.connector.SnowflakeConnection:
        conn = snowflake.connector.connect(
            user=self.cfg.sf_user,
            password=self.cfg.sf_pw,
            account=self.cfg.sf_account,
            warehouse=self.cfg.sf_wh,
            database=self.cfg.sf_db,
            schema=self.cfg.sf_schema,
            role=self.cfg.sf_role,
            client_session_keep_alive=True,
        )
        self.sf_pool.append(conn)
        return conn

    def _sf_close_all(self) -> None:
        for c in self.sf_pool:
            try:
                c.close()
            except Exception:
                pass
        self.sf_pool.clear()

    # -------------------- driver --------------------

    @_monitor
    async def run(self) -> None:
        for coll in self.cfg.collections:
            await self._process_collection(coll)
        self._sf_close_all()

    # ------------------ collection ------------------

    @_monitor
    async def _process_collection(self, coll: str) -> None:
        mc = self.mongo["lead_events"][coll]
        total = await mc.count_documents({})
        limit = self.cfg.test_limit if self.cfg.test_mode else total
        limit = min(total, limit or total)

        cursor = mc.find({}, limit=limit, batch_size=self.cfg.batch_size)
        buf: List[Dict[str, Any]] = []
        async for doc in cursor:
            buf.append(doc)
            if len(buf) >= self.cfg.batch_size:
                await self._process_batch(buf, coll)
                buf = []
        if buf:
            await self._process_batch(buf, coll)

    # --------------------- batch ---------------------

    async def _process_batch(self, docs: List[Dict[str, Any]], coll: str) -> None:
        self.batch_no += 1
        log.info("Batch %s – %s docs", self.batch_no, len(docs))
        df = self._create_df(docs)
        df = self._flatten(df)
        df = self._suffix_type_on_collision(df)  # <--- NEW: disambiguate types by suffix!
        df = self._type_coerce(df)
        df = self._with_metadata(df)
        self._to_adls(df, coll)
        self._to_snowflake(df, coll)
        df.unpersist()

    # -------------------- stages -------------------- #

    def _create_df(self, docs: List[Dict[str, Any]]) -> DataFrame:
        jsons = [json_util.dumps(d) for d in docs]
        rdd = spark.sparkContext.parallelize(jsons)
        return spark.read.json(rdd).repartition(max(1, len(jsons) // 50_000))

    def _flatten(self, df: DataFrame) -> DataFrame:
        seen: Dict[str, int] = {}

        stack: List[Tuple[str, StructType]] = [
            (f.name, f.dataType) for f in df.schema.fields if isinstance(f.dataType, StructType)
        ]
        while stack:
            parent, struct = stack.pop()
            local_seen: Set[str] = set()
            for sub in struct.fields:
                lname = sub.name.lower()
                if lname in local_seen:
                    continue
                local_seen.add(lname)
                path = f"{parent}.{sub.name}"
                safe = _unique(_safe_name(path), seen)
                df = df.withColumn(safe, col(path))
                if isinstance(sub.dataType, StructType):
                    stack.append((path, sub.dataType))

        # --- Deduplicate and flatten columns ---
        from collections import Counter
        cols = df.columns
        counter = Counter([c.lower() for c in cols])
        duplicates = {c.lower() for c, cnt in counter.items() if cnt > 1}
        if duplicates:
            log.warning(f"Duplicate columns found post-flatten: {duplicates}")

        new_columns = []
        registry = {}
        for colname in cols:
            safe = _unique(_safe_name(colname), registry)
            new_columns.append(safe)
        # Ensure no duplicates
        seen_cols = set()
        final_columns = []
        for c in new_columns:
            cc = c.lower()
            if cc in seen_cols:
                suffix = 1
                while f"{c}_{suffix}".lower() in seen_cols:
                    suffix += 1
                c = f"{c}_{suffix}"
            seen_cols.add(c.lower())
            final_columns.append(c)
        df = df.toDF(*final_columns)

        # --- KEY FIX: Drop original struct columns after flattening
        struct_cols = [f.name for f in df.schema.fields if isinstance(f.dataType, StructType)]
        if struct_cols:
            log.info(f"Dropping struct columns after flatten: {struct_cols}")
            df = df.drop(*struct_cols)

        self.global_schema.update(df.columns)
        return df.persist(StorageLevel.MEMORY_AND_DISK)

    def _suffix_type_on_collision(self, df: DataFrame) -> DataFrame:
        """
        If columns have the same name but different types, suffix their type in the column name.
        """
        type_suffix = {
            StringType: "STRING",
            StructType: "STRUCT",
            ArrayType: "ARRAY",
            IntegerType: "INT",
            DoubleType: "DOUBLE",
            BooleanType: "BOOL",
            TimestampType: "TIMESTAMP"
        }
        # Map of lowercased column name to set of types seen
        from collections import defaultdict
        type_map = defaultdict(set)
        for f in df.schema.fields:
            typ = type(f.dataType)
            suffix = type_suffix.get(typ, "UNKNOWN")
            type_map[f.name.lower()].add(suffix)

        # If >1 type seen for any col, suffix each with its type
        rename_map = {}
        for f in df.schema.fields:
            typ = type(f.dataType)
            suffix = type_suffix.get(typ, "UNKNOWN")
            lc = f.name.lower()
            if len(type_map[lc]) > 1:
                rename_map[f.name] = f"{f.name}_{suffix}"

        # Actually rename columns
        newcols = [rename_map.get(c, c) for c in df.columns]
        if newcols != list(df.columns):
            df = df.toDF(*newcols)
        return df

    def _type_coerce(self, df: DataFrame) -> DataFrame:
        for c in df.columns:
            up = c.upper()
            for tokens, typ in _TYPE_RULES.items():
                if any(t in up for t in tokens):
                    df = df.withColumn(c, expr(f"try_cast(`{c}` as {typ.simpleString()})"))
                    break
        return df

    def _with_metadata(self, df: DataFrame) -> DataFrame:
        # Deduplicate only on columns that exist
        id_candidates = [c for c in ("ID", "_ID") if c in df.columns]
        if id_candidates:
            df = df.dropDuplicates(id_candidates)
        df = df.withColumns(
            {
                "ETL_CREATED_DATE": current_timestamp(),
                "ETL_LAST_UPDATE_DATE": current_timestamp(),
                "CREATED_BY": current_user(),
                "EDW_EXTERNAL_SOURCE_SYSTEM": lit("LeadEvents"),
                "ETL_BATCH_ID": lit(self.batch_no),
                "TO_PROCESS": lit(True),
            }
        )
        missing = self.global_schema - set(df.columns)
        for m in missing:
            df = df.withColumn(m, lit(None).cast(StringType()))
        return df

    # -------------------- sinks -------------------- #

    def _to_adls(self, df: DataFrame, coll: str) -> None:
        adls_path = f"{self.cfg.adls}{coll}"
        log.info("Δ write → %s", adls_path)
        print(f"ADLS Save Path: '{adls_path}'")
        (
            df.write.mode("overwrite")
            .format("delta")
            .option("mergeSchema", "true")
            .option("overwriteSchema", "true")
            .save(adls_path)
        )

    def _to_snowflake(self, df: DataFrame, coll: str) -> None:
        table = f"{coll}".upper()
        df_sync = self._sync_sf_schema(df, table)
        opts: Dict[str, str] = {
            "sfURL": f"{self.cfg.sf_account}.snowflakecomputing.com",
            "sfUser": self.cfg.sf_user,
            "sfPassword": self.cfg.sf_pw,
            "sfDatabase": self.cfg.sf_db,
            "sfSchema": self.cfg.sf_schema,
            "sfWarehouse": self.cfg.sf_wh,
            "sfRole": self.cfg.sf_role,
            "dbtable": table,
            "truncate_table": "on",
        }
        df_sync.write.format("snowflake").options(**opts).mode("overwrite").save()
        log.info("Snowflake load ✓ %s", table)

    # ---------- Snowflake schema evolution ---------- #

    def _sync_sf_schema(self, df: DataFrame, table: str) -> DataFrame:
        conn = self._sf_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                """SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA=%(s)s AND TABLE_NAME=%(t)s
                   ORDER BY ORDINAL_POSITION""",
                {"s": self.cfg.sf_schema, "t": table},
            )
            existing = [r[0] for r in cur.fetchall()]
            new_cols = [c for c in df.columns if c.upper() not in {e.upper() for e in existing}]
            for nc in new_cols:
                cur.execute(
                    f'ALTER TABLE {self.cfg.sf_schema}.{table} ADD COLUMN "{nc}" STRING'
                )
            for miss in (c for c in existing if c.upper() not in {d.upper() for d in df.columns}):
                df = df.withColumn(miss, lit(None).cast(StringType()))
            return df.select(*(existing + new_cols)) if existing else df
        finally:
            try:
                cur.close()
            finally:
                conn.close()

# ───────────────────────────── entrypoint ───────────────────────────── #

async def _main() -> None:
    cfg = Config(collections=["events"])
    await DataIntegrator(cfg).run()

if __name__ == "__main__":
    asyncio.run(_main())
  
