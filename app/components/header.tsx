import { Button } from "@/components/ui/button";
import { ArrowLeft, Gamepad2, Trophy, Star } from "lucide-react";
import type { Lesson } from "@shared/schema";
import { motion } from "framer-motion";

interface HeaderProps {
  lesson: Lesson;
  progress: number;
  onBack: () => void;
}

export default function Header({ lesson, progress, onBack }: HeaderProps) {
  return (
    <motion.header 
      className="bg-white dark:bg-gray-900 border-b border-border shadow-sm sticky top-0 z-50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      
      <div className="relative max-w-full mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={onBack}
                className="mr-2 bg-primary/90 text-white hover:bg-primary transition-all"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back
              </Button>
            </motion.div>
            
            <motion.div 
              className="flex items-center space-x-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-lg blur opacity-50 animate-pulse"></div>
                <div className="relative bg-white dark:bg-gray-900 rounded-lg p-1.5">
                  <Gamepad2 className="text-primary h-6 w-6" />
                </div>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Pixel's PyGame Palace
              </h1>
            </motion.div>
            
            <motion.div 
              className="hidden md:flex items-center space-x-3 bg-blue-100 dark:bg-gray-800 rounded-full px-4 py-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-secondary" />
                <span className="text-sm text-muted-foreground">Lesson {lesson.order}:</span>
                <span className="text-sm font-semibold text-foreground">{lesson.title}</span>
              </div>
            </motion.div>
          </div>
          
          <motion.div 
            className="flex items-center space-x-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-sm">
              <Trophy className="h-4 w-4 text-secondary" />
              <span className="text-sm text-muted-foreground">Progress</span>
              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full relative rounded-full overflow-hidden"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(progress)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary"></div>
                </motion.div>
              </div>
              <span className="text-sm font-semibold text-foreground">
                {Math.round(progress)}%
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
