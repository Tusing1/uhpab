
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { Check, X, School, Users, FileCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { studentPremiumPricing } from '@/data/pricing';

const PricingSection = () => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [studentCount, setStudentCount] = useState<'50' | '100' | '200' | 'custom'>('50');

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
      'Responsible AI writing assistance',
      'Integrated APA 7th citation generation',
      'Detailed formatting checks',
      'Premium templates and examples',
      'AI-powered feedback on content',
      'AI suggestions for each section',
    ],
    school: [
      'All premium features for each student',
      'Centralized student management dashboard',
      'Track student progress in real-time',
      'Plagiarism detection & reports',
      'Batch student account creation',
      'Supervisor assignment capabilities',
      'Analytics on common issues and progress',
      'School-branded export documents',
      'Dedicated support representative',
    ],
  };

  const getSchoolPrice = () => {
    if (billingPeriod === 'monthly') {
      switch (studentCount) {
        case '50': return 'UGX 850,000';
        case '100': return 'UGX 1,500,000';
        case '200': return 'UGX 2,800,000';
        case 'custom': return 'Custom';
        default: return 'UGX 850,000';
      }
    } else {
      switch (studentCount) {
        case '50': return 'UGX 8,500,000';
        case '100': return 'UGX 15,000,000';
        case '200': return 'UGX 26,000,000';
        case 'custom': return 'Custom';
        default: return 'UGX 8,500,000';
      }
    }
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
            <div className="text-center mb-6">
              <h3 className="text-xl font-medium mb-2">School Subscription</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Empower your nursing and midwifery students with professional research tools 
                and plagiarism checking capabilities.
              </p>
              
              <div className="mt-6 flex justify-center gap-4 flex-wrap">
                <Button 
                  variant={studentCount === '50' ? 'default' : 'outline'} 
                  onClick={() => setStudentCount('50')}
                >
                  Up to 50 students
                </Button>
                <Button 
                  variant={studentCount === '100' ? 'default' : 'outline'} 
                  onClick={() => setStudentCount('100')}
                >
                  Up to 100 students
                </Button>
                <Button 
                  variant={studentCount === '200' ? 'default' : 'outline'} 
                  onClick={() => setStudentCount('200')}
                >
                  Up to 200 students
                </Button>
                <Button 
                  variant={studentCount === 'custom' ? 'default' : 'outline'} 
                  onClick={() => setStudentCount('custom')}
                >
                  Custom size
                </Button>
              </div>
            </div>
            
            <GlassmorphismCard 
              className="study-card p-8 max-w-4xl mx-auto animate-fade-up [animation-delay:120ms]"
              glow
            >
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-2/3">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <School className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold">School Edition</h3>
                  </div>
                  
                  <p className="text-3xl font-bold mb-2">{getSchoolPrice()}</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    {studentCount === 'custom' ? 'Contact us for custom pricing' : `For ${studentCount} students, billed ${billingPeriod === 'monthly' ? 'monthly' : 'annually'}`}
                  </p>
                  
                  <div className="grid sm:grid-cols-2 gap-4 mb-8">
                    {features.school.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check className="text-green-500 shrink-0 mt-1" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-x-4">
                    <Button asChild size="lg">
                      <Link to="/school-signup">Get Started</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link to="/contact-sales">Contact sales</Link>
                    </Button>
                  </div>
                </div>
                
                <div className="md:w-1/3 bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Highlights for Institutions</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">Centralized management for all your students</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FileCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">Built-in plagiarism detection with detailed reports</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">Custom branding on all exported documents</span>
                    </li>
                  </ul>
                </div>
              </div>
            </GlassmorphismCard>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default PricingSection;
