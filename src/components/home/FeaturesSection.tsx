import { BookOpenCheck, FileText, MessageSquareText, SearchCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: BookOpenCheck,
    title: 'Know what to write next',
    description: 'Follow UHPAB sections in order so your proposal or report does not feel like a blank page.',
    link: '/guidelines',
    color: 'bg-sky-100 text-sky-800',
  },
  {
    icon: SearchCheck,
    title: 'Check your draft early',
    description: 'Upload your work and spot missing parts, formatting issues, and unclear areas before submission.',
    link: '/document-analysis',
    color: 'bg-emerald-100 text-emerald-800',
  },
  {
    icon: MessageSquareText,
    title: 'Make paragraphs clearer',
    description: 'Improve your writing while keeping your own meaning and academic tone.',
    link: '/content-improvement',
    color: 'bg-violet-100 text-violet-800',
  },
  {
    icon: FileText,
    title: 'Keep everything organized',
    description: 'Create projects, track sections, and return to your research work without getting lost.',
    link: '/projects',
    color: 'bg-amber-100 text-amber-800',
  },
];

export const FeaturesSection = () => {
  return (
    <section className="py-14">
      <div className="container max-w-6xl">
        <div className="mb-8 max-w-2xl">
          <span className="soft-marker bg-primary/10 text-primary">What students can do</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">Research help that feels easier to follow</h2>
          <p className="mt-3 text-muted-foreground">
            The app breaks research work into smaller steps so students can keep moving without feeling overwhelmed.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                to={feature.link}
                className="study-card group animate-fade-up rounded-lg p-5"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-md ${feature.color}`}>
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                <span className="mt-4 inline-flex text-sm font-medium text-primary group-hover:underline">
                  Open tool
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
