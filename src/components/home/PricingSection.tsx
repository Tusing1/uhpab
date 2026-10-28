
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { Check, School } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { studentPremiumPricing } from '@/data/pricing';

const PricingSection = () => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const features = {
    free: [
      'UHPAB guideline summaries',
      'Basic outlining templates',
      'UHPAB structure enforcement checks',
      'Plagiarism awareness information',
      'Ethical guidelines',
      'Basic progress tracking',
      'Basic formatting guidance',
    ],
    premium: [
      'Guided section writing support',
      'Clear academic paragraph improvement',
      'Responsible Advanced Researcher writing assistance',
      'Integrated APA 7th citation generation',
      'Detailed formatting checks',
      'Premium templates and examples',
      'Advanced feedback on content',
      'Smart suggestions for each section',
    ],
  };

  return (
    <section className="py-16">
      <div className="container mx-auto max-w-6xl">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <span className="soft-marker bg-amber-100 text-amber-800">Simple plans</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">Start free, upgrade when you need stronger help</h2>
          <p className="mt-3 text-muted-foreground">
            Students can begin with the basics, then unlock deeper writing support and document checks when research work gets serious.
          </p>
        </div>
        
        <div className="flex justify-center mb-8">
          <div className="bg-muted/50 p-1 rounded-full flex items-center">
            <div className="flex items-center gap-2 px-3">
              <Switch 
                id="billing-switch"
                checked={billingPeriod === 'annual'}
                onCheckedChange={(checked) => setBillingPeriod(checked ? 'annual' : 'monthly')}
              />
              <Label htmlFor="billing-switch" className="text-sm">
                {billingPeriod === 'monthly' ? 'Monthly billing' : 'Annual billing (10% off)'}
              </Label>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="individual" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-8">
            <TabsTrigger value="individual">Individual</TabsTrigger>
            <TabsTrigger value="institution">Educational Institution</TabsTrigger>
          </TabsList>
          
          <TabsContent value="individual" className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Free Plan */}
              <GlassmorphismCard 
                className="study-card p-6 animate-fade-up"
                glow
              >
                <div className="flex flex-col h-full">
                  <h3 className="text-2xl font-bold mb-2">Free</h3>
                  <p className="text-3xl font-bold mb-6">UGX 0/mo</p>
                  <div className="space-y-4 mb-8 flex-grow">
                    {features.free.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="text-green-500 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button asChild className="w-full" variant="outline">
                    <Link to="/register">Get Started</Link>
                  </Button>
                </div>
              </GlassmorphismCard>

              {/* Premium Plan */}
              <GlassmorphismCard 
                className="study-card p-6 relative overflow-hidden animate-fade-up [animation-delay:120ms]"
                glow
              >
                <div className="absolute -right-16 -top-2 rotate-45 bg-primary text-white px-12 py-1 text-sm">
                  Popular
                </div>
                <div className="flex flex-col h-full">
                  <h3 className="text-2xl font-bold mb-2">Premium</h3>
                  <p className="text-3xl font-bold mb-1">
                    {billingPeriod === 'monthly'
                      ? studentPremiumPricing.monthly.compact
                      : studentPremiumPricing.annual.compact}
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">Everything in Free, plus:</p>
                  <div className="space-y-4 mb-8 flex-grow">
                    {features.premium.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="text-green-500 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button asChild className="w-full">
                    <Link to="/premium">Upgrade Now</Link>
                  </Button>
                </div>
              </GlassmorphismCard>
            </div>
          </TabsContent>
          
          <TabsContent value="institution" className="space-y-8">
            <GlassmorphismCard className="study-card mx-auto max-w-3xl p-8">
              <School className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-xl font-semibold">School collaboration</h3>
              <p className="mt-3 leading-7 text-muted-foreground">Shared candidate records, assignments and supervisor reviews are not available yet. Students can use their individual research workspaces and share downloaded work through their school.</p>
              <Button asChild variant="outline" className="mt-5"><Link to="/school-signup">View availability</Link></Button>
            </GlassmorphismCard>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default PricingSection;
