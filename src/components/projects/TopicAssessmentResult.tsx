
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, CheckCircle, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { TopicAssessmentResult } from './TopicAssessment';

interface TopicAssessmentResultsProps {
  result: TopicAssessmentResult;
  onProceed: () => void;
  onEditTopic: () => void;
}

export const TopicAssessmentResults: React.FC<TopicAssessmentResultsProps> = ({
  result,
  onProceed,
  onEditTopic
}) => {
  const { topic, isValid, score, feedback, variables, recommendation } = result;
  
  const getRecommendationIcon = () => {
    switch (recommendation.type) {
      case 'good':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'caution':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'reconsider':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'stop':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Lightbulb className="h-5 w-5 text-primary" />;
    }
  };
  
  const getRecommendationColor = () => {
    switch (recommendation.type) {
      case 'good':
        return 'text-green-600 dark:text-green-400';
      case 'caution':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'reconsider':
        return 'text-orange-600 dark:text-orange-400';
      case 'stop':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-primary';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Topic Assessment Results</h2>
        <p className="text-muted-foreground">
          Review your topic assessment results based on the FINER criteria.
        </p>
      </div>
      
      <Card className="bg-muted/30">
        <CardContent className="pt-6 space-y-3">
          <h3 className="font-semibold text-lg">Topic Analysis</h3>
          <div className="space-y-1.5">
            <p className="font-medium">Topic:</p>
            <p className="bg-background p-2 rounded border">{topic}</p>
          </div>
          
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <p className="font-medium">Independent Variable(s):</p>
              <p className="bg-background p-2 rounded border">{variables.iv}</p>
            </div>
            <div className="space-y-1.5">
              <p className="font-medium">Dependent Variable:</p>
              <p className="bg-background p-2 rounded border">{variables.dv}</p>
            </div>
            <div className="space-y-1.5">
              <p className="font-medium">Target Population:</p>
              <p className="bg-background p-2 rounded border">{variables.population}</p>
            </div>
            <div className="space-y-1.5">
              <p className="font-medium">Study Location:</p>
              <p className="bg-background p-2 rounded border">{variables.location}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Alert variant={isValid ? "default" : "destructive"} className="mt-4">
        <div className="flex items-center gap-2">
          {getRecommendationIcon()}
          <AlertTitle className={getRecommendationColor()}>
            FINER Assessment Score: {score}/10
          </AlertTitle>
        </div>
        <AlertDescription className="mt-2">
          <p className={`font-medium ${getRecommendationColor()}`}>{recommendation.text}</p>
        </AlertDescription>
      </Alert>
      
      {feedback.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" /> Feedback
            </h3>
            <ul className="space-y-2">
              {feedback.map((item, index) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onEditTopic}>
          Edit Topic
        </Button>
        <Button 
          onClick={onProceed} 
          disabled={!isValid && recommendation.type === 'stop'} 
          className="gap-2"
        >
          {isValid ? 'Proceed to Create Project' : 'Proceed Anyway'} 
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
