import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Code2, Play, Settings } from 'lucide-react';
import { EmbeddedComponentType } from './wizard-types';

interface CodeRunnerProps {
  type: EmbeddedComponentType;
  onClose?: () => void;
  className?: string;
}

// Placeholder component for WizardCodeEditor
export function WizardCodeEditor({ onClose, className = '' }: CodeRunnerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`w-full h-full ${className}`}
    >
      <Card className="p-6 h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Code Editor</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              data-testid="close-code-editor"
            >
              ✕
            </button>
          )}
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-[calc(100%-5rem)]">
          <p className="text-gray-500 dark:text-gray-400">
            Code editor implementation pending...
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

// Placeholder component for ProfessionalEditor
export function ProfessionalEditor({ onClose, className = '' }: CodeRunnerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`w-full h-full ${className}`}
    >
      <Card className="p-6 h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Professional Editor</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              data-testid="close-professional-editor"
            >
              ✕
            </button>
          )}
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-[calc(100%-5rem)]">
          <p className="text-gray-500 dark:text-gray-400">
            Professional editor implementation pending...
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

// Placeholder component for CodeBlockBuilder
export function CodeBlockBuilder({ onClose, className = '' }: CodeRunnerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`w-full h-full ${className}`}
    >
      <Card className="p-6 h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Code Block Builder</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              data-testid="close-code-block-builder"
            >
              ✕
            </button>
          )}
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-[calc(100%-5rem)]">
          <p className="text-gray-500 dark:text-gray-400">
            Code block builder implementation pending...
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

// Main code runner component that switches between different editors
export default function WizardCodeRunner({ 
  type, 
  onClose,
  className = '' 
}: CodeRunnerProps) {
  switch (type) {
    case 'code-editor':
      return <WizardCodeEditor type={type} onClose={onClose} className={className} />;
    case 'professional-editor':
      return <ProfessionalEditor type={type} onClose={onClose} className={className} />;
    case 'block-builder':
      return <CodeBlockBuilder type={type} onClose={onClose} className={className} />;
    default:
      return null;
  }
}