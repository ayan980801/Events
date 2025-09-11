import 'package:flutter/material.dart';
import '../../domain/entities/workflow.dart';

class WorkflowCard extends StatelessWidget {
  final Workflow workflow;
  final VoidCallback onTap;
  final VoidCallback? onView;
  final VoidCallback? onEdit;
  final bool isTemplate;

  const WorkflowCard({
    super.key,
    required this.workflow,
    required this.onTap,
    this.onView,
    this.onEdit,
    required this.isTemplate,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with title and category
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          workflow.name,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            _buildCategoryChip(context),
                            const SizedBox(width: 8),
                            if (isTemplate) _buildTemplateChip(context),
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (!isTemplate && onEdit != null)
                    PopupMenuButton<String>(
                      onSelected: (value) {
                        switch (value) {
                          case 'view':
                            onView?.call();
                            break;
                          case 'edit':
                            onEdit?.call();
                            break;
                        }
                      },
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'view',
                          child: Row(
                            children: [
                              Icon(Icons.visibility),
                              SizedBox(width: 8),
                              Text('View Details'),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              Icon(Icons.edit),
                              SizedBox(width: 8),
                              Text('Edit'),
                            ],
                          ),
                        ),
                      ],
                    ),
                ],
              ),
              
              if (workflow.description != null) ...[
                const SizedBox(height: 12),
                Text(
                  workflow.description!,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ],

              const SizedBox(height: 16),

              // Workflow metadata
              Row(
                children: [
                  // Duration
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.schedule,
                        size: 16,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        workflow.formattedDuration,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 16),
                  
                  // Steps count
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.list_alt,
                        size: 16,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${workflow.steps.length} steps',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  
                  const Spacer(),
                  
                  // Start button
                  FilledButton.icon(
                    onPressed: onTap,
                    icon: const Icon(Icons.play_arrow, size: 18),
                    label: const Text('Start'),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      minimumSize: const Size(0, 32),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryChip(BuildContext context) {
    final categoryInfo = _getCategoryInfo(workflow.category);
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: categoryInfo.$2.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: categoryInfo.$2.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            categoryInfo.$1,
            size: 12,
            color: categoryInfo.$2,
          ),
          const SizedBox(width: 4),
          Text(
            workflow.categoryDisplayName,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: categoryInfo.$2,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTemplateChip(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.library_books,
            size: 12,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(width: 4),
          Text(
            'Template',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  (IconData, Color) _getCategoryInfo(WorkflowCategory category) {
    switch (category) {
      case WorkflowCategory.taskManagement:
        return (Icons.assignment, Colors.blue);
      case WorkflowCategory.decisionMaking:
        return (Icons.psychology, Colors.purple);
      case WorkflowCategory.planning:
        return (Icons.calendar_month, Colors.green);
      case WorkflowCategory.problemSolving:
        return (Icons.lightbulb, Colors.orange);
      case WorkflowCategory.learning:
        return (Icons.school, Colors.indigo);
      case WorkflowCategory.brainstorming:
        return (Icons.wb_incandescent, Colors.amber);
      case WorkflowCategory.custom:
        return (Icons.tune, Colors.grey);
    }
  }
}