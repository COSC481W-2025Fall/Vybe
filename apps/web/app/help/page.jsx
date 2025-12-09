'use client';

import { useState } from 'react';
import { MessageCircle, Send, HelpCircle, Users, Music, Settings, ChevronDown, Loader2, CheckCircle, AlertCircle, Bug, Lightbulb, ThumbsUp, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

const SUBJECT_OPTIONS = [
  { value: 'bug', label: 'Bug Report', icon: Bug, color: 'red' },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'yellow' },
  { value: 'question', label: 'Question', icon: HelpCircle, color: 'blue' },
  { value: 'feedback', label: 'Feedback', icon: ThumbsUp, color: 'green' },
  { value: 'other', label: 'Other', icon: MoreHorizontal, color: 'purple' },
];

const FAQ_ITEMS = [
  {
    question: "How do I create a group?",
    answer: "Click the 'Create Group' button on the Groups page or homepage. Give your group a name and optional description, then share the join code with friends!"
  },
  {
    question: "How does Smart Sort work?",
    answer: "Smart Sort uses AI to analyze your songs and create a perfectly flowing playlist. It considers genre, tempo, energy, and more to avoid consecutive same-artist or same-genre songs while keeping popular tracks near the top."
  },
  {
    question: "Why is sorting taking a while?",
    answer: "During high-traffic times (like demos), sorting requests are queued to ensure quality results for everyone. You can choose 'Quick Sort' to get instant results using our fast local algorithm, or wait for AI-enhanced sorting."
  },
  {
    question: "How do I add a playlist to a group?",
    answer: "In your group, click 'Add Playlist' and paste a Spotify or YouTube playlist URL. We'll import all the songs automatically!"
  },
  {
    question: "How do I share my song of the day?",
    answer: "Go to your Profile and click 'Share Song of the Day'. Search for any song and share it with your friends!"
  },
  {
    question: "What are 'Our Playlists'?",
    answer: "Our Playlists are curated public playlists from the Vybe community. Browse them to discover new music and see what others are listening to!"
  },
  {
    question: "Can I customize the app's appearance?",
    answer: "Yes! Click the theme icon in the navigation bar to choose from preset themes, create your own custom color scheme, or toggle the background animation on/off."
  },
];

function getSubjectButtonClasses(optionColor, isSelected) {
  if (!isSelected) {
    return 'bg-[var(--secondary-bg)] text-[var(--muted-foreground)] border-2 border-transparent hover:border-[var(--glass-border)] hover:text-[var(--foreground)]';
  }
  
  switch (optionColor) {
    case 'red': return 'bg-red-500/20 text-red-400 border-2 border-red-500/50';
    case 'yellow': return 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/50';
    case 'blue': return 'bg-blue-500/20 text-blue-400 border-2 border-blue-500/50';
    case 'green': return 'bg-green-500/20 text-green-400 border-2 border-green-500/50';
    default: return 'bg-[var(--accent)]/20 text-[var(--accent)] border-2 border-[var(--accent)]/50';
  }
}

export default function HelpPage() {
  const [openFAQ, setOpenFAQ] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      toast.success('Message sent! We\'ll get back to you soon.');
    } catch (error) {
      console.error('Contact form error:', error);
      setSubmitStatus('error');
      toast.error(error.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[var(--accent)]/20 mb-4">
            <HelpCircle className="h-8 w-8 text-[var(--accent)]" />
          </div>
          <h1 className="page-title text-3xl sm:text-4xl mb-3">Help Center</h1>
          <p className="section-subtitle text-lg">
            Got questions? We've got answers. Can't find what you need? Contact us!
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <a 
            href="/groups"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card p-6 rounded-2xl hover:border-[var(--accent)]/50 transition-all group text-center"
          >
            <Users className="h-8 w-8 text-[var(--accent)] mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-[var(--foreground)] mb-1">Groups</h3>
            <p className="text-sm text-[var(--muted-foreground)]">Collaborate with friends</p>
          </a>
          <a 
            href="/communities"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card p-6 rounded-2xl hover:border-pink-500/50 transition-all group text-center"
          >
            <Music className="h-8 w-8 text-pink-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-[var(--foreground)] mb-1">Our Playlists</h3>
            <p className="text-sm text-[var(--muted-foreground)]">Discover new music</p>
          </a>
          <a 
            href="/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card p-6 rounded-2xl hover:border-blue-500/50 transition-all group text-center"
          >
            <Settings className="h-8 w-8 text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-[var(--foreground)] mb-1">Settings</h3>
            <p className="text-sm text-[var(--muted-foreground)]">Customize your experience</p>
          </a>
        </div>

        {/* FAQ Section */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 mb-12">
          <h2 className="section-title text-xl sm:text-2xl mb-6 flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-[var(--accent)]" />
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFAQ === index;
              return (
                <div 
                  key={index}
                  className={`rounded-xl overflow-hidden transition-all duration-200 ${
                    isOpen 
                      ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30' 
                      : 'bg-[var(--secondary-bg)] border border-transparent hover:border-[var(--glass-border)]'
                  }`}
                >
                  <button
                    onClick={() => setOpenFAQ(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left gap-4"
                  >
                    <span className={`font-medium ${isOpen ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'}`}>
                      {item.question}
                    </span>
                    <div className={`flex-shrink-0 p-1 rounded-lg transition-all duration-200 ${
                      isOpen ? 'bg-[var(--accent)]/20 rotate-180' : 'bg-[var(--glass-border)]'
                    }`}>
                      <ChevronDown className={`h-4 w-4 transition-colors ${
                        isOpen ? 'text-[var(--accent)]' : 'text-[var(--muted-foreground)]'
                      }`} />
                    </div>
                  </button>
                  <div 
                    className={`overflow-hidden transition-all duration-200 ease-out ${
                      isOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-4 pb-4 text-[var(--muted-foreground)] leading-relaxed text-sm sm:text-base">
                      {item.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact Form */}
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <h2 className="section-title text-xl sm:text-2xl mb-2 flex items-center gap-2">
            <Send className="h-6 w-6 text-[var(--accent)]" />
            Contact Us
          </h2>
          <p className="section-subtitle mb-6">
            Have feedback, found a bug, or need help? Send us a message!
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--secondary-bg)] border border-[var(--glass-border)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/50 transition-all"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--secondary-bg)] border border-[var(--glass-border)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/50 transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Subject - Tag Buttons */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Subject
              </label>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_OPTIONS.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({ ...formData, subject: value })}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      getSubjectButtonClasses(color, formData.subject === value)
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              {!formData.subject && (
                <p className="text-xs text-[var(--muted-foreground)] mt-2">Select a topic above</p>
              )}
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Message
              </label>
              <textarea
                id="message"
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[var(--secondary-bg)] border border-[var(--glass-border)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/50 transition-all resize-none"
                placeholder="Tell us what's on your mind..."
              />
            </div>

            {submitStatus === 'success' && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <span>Message sent successfully! We'll get back to you soon.</span>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>Failed to send message. Please try again or email us directly.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !formData.subject}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-[var(--accent)] to-pink-600 hover:opacity-90 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Send Message
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-[var(--muted-foreground)] text-sm">
          <p>© 2025 Vybe. Made with 💜 for music lovers.</p>
        </div>
      </div>
    </div>
  );
}
