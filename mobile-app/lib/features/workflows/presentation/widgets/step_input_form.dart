import 'package:flutter/material.dart';
import '../../domain/entities/workflow_execution.dart';

class StepInputForm extends StatefulWidget {
  final WorkflowStepExecution stepExecution;
  final Function(String input, Map<String, dynamic>? data) onSubmit;

  const StepInputForm({
    super.key,
    required this.stepExecution,
    required this.onSubmit,
  });

  @override
  State<StepInputForm> createState() => _StepInputFormState();
}

class _StepInputFormState extends State<StepInputForm> {
  final _formKey = GlobalKey<FormState>();
  final _textController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Row(
                children: [
                  Icon(
                    Icons.edit,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Your Input',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Input field with guidance
              _buildInputField(context),
              
              const SizedBox(height: 16),
              
              // Submit button
              _buildSubmitButton(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInputField(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Input guidance text
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12.0),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: Theme.of(context).colorScheme.primary.withOpacity(0.2),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.lightbulb_outline,
                    size: 16,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Guidance',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                _getInputGuidance(),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Text input field
        TextFormField(
          controller: _textController,
          maxLines: 4,
          decoration: InputDecoration(
            hintText: _getInputHint(),
            border: const OutlineInputBorder(),
            enabledBorder: OutlineInputBorder(
              borderSide: BorderSide(
                color: Theme.of(context).colorScheme.outline,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderSide: BorderSide(
                color: Theme.of(context).colorScheme.primary,
                width: 2,
              ),
            ),
            contentPadding: const EdgeInsets.all(16),
          ),
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Please provide your input to continue';
            }
            
            // Additional validation based on step requirements
            final minLength = _getMinInputLength();
            if (minLength > 0 && value.trim().length < minLength) {
              return 'Please provide at least $minLength characters';
            }
            
            return null;
          },
          onFieldSubmitted: (_) => _submitForm(),
        ),
        
        // Character count or additional hints
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: Text(
                _getAdditionalHint(),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            if (_textController.text.isNotEmpty)
              Text(
                '${_textController.text.length} characters',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildSubmitButton(BuildContext context) {
    return FilledButton.icon(
      onPressed: _isSubmitting ? null : _submitForm,
      icon: _isSubmitting 
        ? SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(
                Theme.of(context).colorScheme.onPrimary,
              ),
            ),
          )
        : const Icon(Icons.send),
      label: Text(_isSubmitting ? 'Processing...' : 'Continue'),
      style: FilledButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
      ),
    );
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() {
      _isSubmitting = true;
    });
    
    try {
      final input = _textController.text.trim();
      final additionalData = _getAdditionalData();
      
      await widget.onSubmit(input, additionalData);
      
      // Clear the form after successful submission
      _textController.clear();
    } catch (e) {
      // Error handling is done in the parent widget
      // We just need to reset the submitting state
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  String _getInputGuidance() {
    // This would ideally come from the workflow step configuration
    // For now, provide generic guidance based on step type
    final stepName = widget.stepExecution.stepName.toLowerCase();
    
    if (stepName.contains('goal') || stepName.contains('objective')) {
      return 'Describe your goals clearly and specifically. Think about what you want to achieve and when you want to achieve it.';
    } else if (stepName.contains('task') || stepName.contains('activity')) {
      return 'List all the tasks or activities you can think of. Don\'t worry about the order or priority yet - just brain dump everything.';
    } else if (stepName.contains('decision') || stepName.contains('choice')) {
      return 'Consider all your options carefully. Think about the pros and cons of each choice and how they align with your goals.';
    } else if (stepName.contains('problem') || stepName.contains('challenge')) {
      return 'Describe the problem in detail. What is the current situation? What would the ideal situation look like?';
    } else if (stepName.contains('learn') || stepName.contains('study')) {
      return 'Think about your learning objectives, current knowledge level, and preferred learning methods.';
    } else {
      return 'Take your time to think through your response. Be as detailed and specific as possible to get the best guidance.';
    }
  }

  String _getInputHint() {
    final stepName = widget.stepExecution.stepName.toLowerCase();
    
    if (stepName.contains('goal') || stepName.contains('objective')) {
      return 'e.g., I want to launch a new product by Q2 next year...';
    } else if (stepName.contains('task') || stepName.contains('activity')) {
      return 'e.g., Research competitors, Design mockups, Create timeline...';
    } else if (stepName.contains('decision') || stepName.contains('choice')) {
      return 'e.g., Option A would give me X benefits but has Y risks...';
    } else if (stepName.contains('problem') || stepName.contains('challenge')) {
      return 'e.g., The current process takes too long because...';
    } else if (stepName.contains('learn') || stepName.contains('study')) {
      return 'e.g., I want to learn React because I need it for my job...';
    } else {
      return 'Share your thoughts and ideas here...';
    }
  }

  String _getAdditionalHint() {
    return 'Tip: The more detail you provide, the better personalized guidance you\'ll receive.';
  }

  int _getMinInputLength() {
    // Minimum character count based on step type
    final stepName = widget.stepExecution.stepName.toLowerCase();
    
    if (stepName.contains('goal') || stepName.contains('problem')) {
      return 20; // More detail required for goals and problems
    } else {
      return 10; // Basic minimum for other steps
    }
  }

  Map<String, dynamic>? _getAdditionalData() {
    // This could be expanded to include additional structured data
    // based on the step type or configuration
    return {
      'timestamp': DateTime.now().toIso8601String(),
      'stepId': widget.stepExecution.stepId,
      'stepName': widget.stepExecution.stepName,
      'inputLength': _textController.text.trim().length,
    };
  }
}