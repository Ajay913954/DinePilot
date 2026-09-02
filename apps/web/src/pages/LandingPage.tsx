import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  Calendar, 
  Users, 
  Bot, 
  Megaphone, 
  Star, 
  BarChart3, 
  CheckCircle2, 
  XCircle,
  MessageSquare,
  UtensilsCrossed,
  ShieldCheck,
  TrendingUp,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-32 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-amber-500/20 text-xs font-semibold text-amber-400">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Next-Gen AI Business Partner for Restaurants</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                Run Your Restaurant <span className="gradient-text">Smarter.</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                DinePilot brings reservations, customers, communication, marketing, and AI-powered automation into one simple platform.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link to="/signup" className="w-full sm:w-auto">
                  <Button size="lg" variant="primary" className="w-full sm:w-auto" rightIcon={<ArrowRight className="w-5 h-5 text-slate-950" />}>
                    Start Free
                  </Button>
                </Link>
                <a href="#demo" className="w-full sm:w-auto">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    Book a Demo
                  </Button>
                </a>
              </div>

              {/* Social Proof metrics */}
              <div className="pt-8 border-t border-slate-800/80 grid grid-cols-3 gap-4 text-center lg:text-left">
                <div>
                  <p className="text-2xl font-bold text-white">99.9%</p>
                  <p className="text-xs text-slate-400">Platform Uptime</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">35%+</p>
                  <p className="text-xs text-slate-400">Repeat Customers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">10x</p>
                  <p className="text-xs text-slate-400">Faster Follow-ups</p>
                </div>
              </div>
            </div>

            {/* Right Dashboard Preview */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl p-1 bg-gradient-to-b from-amber-500/30 via-slate-800/50 to-slate-900 shadow-2xl glow-amber">
                <div className="rounded-xl bg-slate-900 p-5 space-y-5 border border-slate-800">
                  {/* Dashboard Header Preview */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                        <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">La Trattoria Bistro</h4>
                        <p className="text-[10px] text-slate-400">DinePilot Operations Dashboard</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      Active Session
                    </span>
                  </div>

                  {/* Dashboard Mock Widgets */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Today's Covers</span>
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <p className="text-lg font-bold text-white">48 Tables</p>
                      <span className="text-[10px] text-emerald-400 font-medium">+12% vs last week</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>AI Assistant</span>
                        <Bot className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <p className="text-lg font-bold text-white">24 Replied</p>
                      <span className="text-[10px] text-amber-400 font-medium">WhatsApp Automated</span>
                    </div>
                  </div>

                  {/* Mock Activity List */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400">Live Activity Feed</p>
                    <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-200">Table #4 Confirmed</span>
                      </div>
                      <span className="text-[10px] text-slate-500">2m ago</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-slate-200">New 5-Star Review</span>
                      </div>
                      <span className="text-[10px] text-slate-500">12m ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-slate-900/60 border-y border-slate-800/80 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">The Problem</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Running a restaurant shouldn't mean managing everything manually.
            </h2>
            <p className="text-slate-400 text-base">
              Traditional operations fragment your team across paper logs, separate messaging apps, and lost opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Missed Reservations', desc: 'Phone calls during peak hours lead to lost table bookings and frustrated guests.', icon: Calendar },
              { title: 'Unanswered WhatsApp Messages', desc: 'Customer inquiries left pending for hours harm your brand reputation.', icon: MessageSquare },
              { title: 'Lost Customer Information', desc: 'No guest profile history means missing dietary preferences and birthdays.', icon: Users },
              { title: 'Manual Follow-ups', desc: 'Staff spend precious hours sending individual reminders and confirmation texts.', icon: Clock },
              { title: 'Low Repeat Visits', desc: 'Lack of automated loyalty messaging results in zero re-engagement.', icon: TrendingUp },
              { title: 'Difficult Reporting', desc: 'Scattered data across spreadsheets makes business decision-making a guesswork.', icon: BarChart3 }
            ].map((problem, i) => (
              <Card key={i} className="border-rose-900/20 bg-slate-900/40 hover:border-rose-500/30 group transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-100 group-hover:text-rose-300 transition-colors">
                      {problem.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {problem.desc}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="features" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">The Solution</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              One platform. One place. More control.
            </h2>
            <p className="text-slate-400 text-base">
              DinePilot unifies your entire restaurant operation into an integrated AI-driven ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'Reservations', desc: 'Automated table allocation, floorplan management, and instant guest confirmations.', icon: Calendar },
              { title: 'Customer CRM', desc: 'Comprehensive guest database with order preferences, spend metrics, and notes.', icon: Users },
              { title: 'AI Assistant', desc: 'Smart AI handler for WhatsApp inquiries, menu questions, and instant bookings.', icon: Bot },
              { title: 'Marketing', desc: 'Automated SMS & WhatsApp campaigns for birthdays, special events, and quiet days.', icon: Megaphone },
              { title: 'Reviews', desc: 'Centralized review aggregator to monitor feedback and automatically request ratings.', icon: Star },
              { title: 'Analytics', desc: 'Real-time revenue reports, peak seating metrics, and staff performance intelligence.', icon: BarChart3 }
            ].map((module, index) => (
              <Card key={index} className="glass-card hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Module Preview
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all duration-300">
                    <module.icon className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">{module.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{module.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-900/60 border-t border-slate-800/80 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Simple Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              How DinePilot Works
            </h2>
            <p className="text-slate-400 text-base">
              Get your restaurant up and running in under 5 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {[
              { step: '01', title: 'Connect your restaurant', desc: 'Create your account, input basic dining details, and set up your floor specs.' },
              { step: '02', title: 'Manage your customers', desc: 'Centralize guest records, table assignments, and booking preferences.' },
              { step: '03', title: 'Automate repetitive work', desc: 'Let DinePilot handle instant confirmations, WhatsApp queries, and reminders.' },
              { step: '04', title: 'Grow your business', desc: 'Analyze seating trends, boost repeat visits, and increase your daily revenue.' }
            ].map((item, index) => (
              <div key={index} className="space-y-4 text-center md:text-left relative">
                <div className="text-4xl font-black text-amber-500/30 font-mono">{item.step}</div>
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl p-10 sm:p-16 glass-panel border border-amber-500/30 text-center space-y-8 relative overflow-hidden glow-amber">
            <div className="space-y-4 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                Ready to make your restaurant smarter?
              </h2>
              <p className="text-slate-300 text-base sm:text-lg">
                Join modern restaurants automating their operations with DinePilot today.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="w-full sm:w-auto">
                <Button size="lg" variant="primary" className="w-full sm:w-auto" rightIcon={<ArrowRight className="w-5 h-5 text-slate-950" />}>
                  Start Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
