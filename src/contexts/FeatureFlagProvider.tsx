import { createContext, ReactNode, useContext } from 'react';
import { getFeatureFlags } from '../api/featureFlags';

interface FeatureFlag {
  feature: {
    name: string;
  };
  enabled: boolean;
}

interface FeatureFlagObjectContextType {
  featureFlagObject: Record<string, boolean>;
}

const FeatureFlagObjectContext = createContext<FeatureFlagObjectContextType | undefined>(undefined);

interface FeatureFlagObjectProviderProps {
  children: ReactNode;
}

export const FeatureFlagProvider: React.FC<FeatureFlagObjectProviderProps> = ({ children }) => {
  // Fetch feature flags and create object
  const fetchFlags = async () => {
    const flags = await getFeatureFlags();
    const featureFlagObject = flags.reduce((acc: Record<string, boolean>, flag: FeatureFlag) => {
      const flagName = flag.feature?.name;
      if (flagName) {
        acc[flagName] = flag.enabled;
      }
      return acc;
    }, {} as Record<string, boolean>);

    return featureFlagObject;
  };

  // Start fetching flags
  fetchFlags();

  const contextValue: FeatureFlagObjectContextType = {
    featureFlagObject: {},
  };

  return (
    <FeatureFlagObjectContext.Provider value={contextValue}>
      {children}
    </FeatureFlagObjectContext.Provider>
  );
};

export const useFeatureFlagObjectContext = (): FeatureFlagObjectContextType => {
  const context = useContext(FeatureFlagObjectContext);
  if (context === undefined) {
    throw new Error('useFeatureFlagObjectContext must be used within a FeatureFlagObjectProvider');
  }
  return context;
};
