
import React, { createContext, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AccessTier, FeatureAccess } from '@/types';

interface FeatureAccessContextType {
  canAccess: (featureId: string) => boolean;
  getAccessibleFeatures: () => FeatureAccess[];
  getPremiumFeatures: () => FeatureAccess[];
  getFeatureAccessTier: (featureId: string) => AccessTier;
}

// Export the context so it can be imported elsewhere
export const FeatureAccessContext = createContext<FeatureAccessContextType | undefined>(undefined);

// Define all features and their access tiers
const features: FeatureAccess[] = [
  // Free tier features
  { feature: 'guidelines-overview', tier: 'free', description: 'UHPAB guideline summaries' },
  { feature: 'basic-outline-template', tier: 'free', description: 'Basic outlining templates' },
  { feature: 'structure-enforcement', tier: 'free', description: 'UHPAB structure enforcement checks' },
  { feature: 'plagiarism-awareness', tier: 'free', description: 'Plagiarism awareness information' },
  { feature: 'ethical-guidelines', tier: 'free', description: 'Research ethical guidelines' },
  { feature: 'progress-tracking', tier: 'free', description: 'Basic progress tracking' },
  { feature: 'basic-formatting', tier: 'free', description: 'Basic formatting guidance' },
  
  // Premium tier features
  { feature: 'ai-content-generation', tier: 'premium', description: 'AI-powered content generation' },
  { feature: 'advanced-paraphrasing', tier: 'premium', description: 'Advanced paraphrasing' },
  { feature: 'ai-humanization', tier: 'premium', description: 'Human review and academic style smoothing' },
  { feature: 'auto-citation', tier: 'premium', description: 'Integrated APA 7th citation generation' },
  { feature: 'detailed-formatting', tier: 'premium', description: 'Detailed formatting checks' },
  { feature: 'premium-templates', tier: 'premium', description: 'Premium templates and examples' },
  { feature: 'ai-feedback', tier: 'premium', description: 'AI-powered feedback on content' },
  { feature: 'chapter-suggestions', tier: 'premium', description: 'AI suggestions for each section' }
];

export const FeatureAccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isPremium } = useAuth();

  const canAccess = (featureId: string): boolean => {
    if (isPremium()) {
      return true;
    }
    
    if (!user) return false;
    
    const feature = features.find(f => f.feature === featureId);
    if (!feature) return false;
    
    if (feature.tier === 'free') return true;
    
    return isPremium();
  };

  const getAccessibleFeatures = (): FeatureAccess[] => {
    if (!user) return [];
    
    if (isPremium()) {
      return features;
    }
    
    if (isPremium()) {
      return features;
    } else {
      return features.filter(f => f.tier === 'free');
    }
  };

  const getPremiumFeatures = (): FeatureAccess[] => {
    return features.filter(f => f.tier === 'premium');
  };

  const getFeatureAccessTier = (featureId: string): AccessTier => {
    const feature = features.find(f => f.feature === featureId);
    return feature?.tier || 'premium';
  };

  return (
    <FeatureAccessContext.Provider
      value={{
        canAccess,
        getAccessibleFeatures,
        getPremiumFeatures,
        getFeatureAccessTier
      }}
    >
      {children}
    </FeatureAccessContext.Provider>
  );
};

export const useFeatureAccess = () => {
  const context = useContext(FeatureAccessContext);
  if (context === undefined) {
    throw new Error('useFeatureAccess must be used within a FeatureAccessProvider');
  }
  return context;
};
