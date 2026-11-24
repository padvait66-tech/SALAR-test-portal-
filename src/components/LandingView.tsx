import { useState } from 'react';
import { ArrowRight, Check, Clock, Mail, MapPin, Menu, Phone, UserPlus, X } from 'lucide-react';
import type {
  CoursePackage,
  ExamPaper,
  InstituteSettings,
  PaymentRecord,
  PublicLicenseSummary,
  TestSeriesPackage,
} from '../types/portal';
import { PORTAL_IMAGES } from '../data/seedPortalData';
import { ResilientImage } from './ResilientImage';

interface LandingViewProps {
  settings: InstituteSettings;
  courses: CoursePackage[];
  testSeries: TestSeriesPackage[];
  liveExams: ExamPaper[];
  examCount: number;
  questionCount: number;
  license?: PublicLicenseSummary;
  onOpenLogin: () => void;
  onOpenAuthModal: (role: 'student' | 'admin', mode?: 'signin' | 'signup') => void;
  onOpenQuickJoin: (exam: ExamPaper) => void;
  onOpenSharedExam: (examId: string) => void;
  onStartCheckout: (item: { name: string; type: PaymentRecord['itemType']; amount: number }) => void;
  onSecretOwnerTrigger?: () => void;
}

export function LandingView({
  settings,
  courses,
  testSeries,
  liveExams,
  examCount,
  questionCount,
  license,
  onOpenLogin,
  onOpenAuthModal,
  onOpenQuickJoin,
  onOpenSharedExam,
  onStartCheckout,
  onSecretOwnerTrigger,
}: LandingViewProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [footerClickCount, setFooterClickCount] = useState(0);

  const handleFooterBrandClick = () => {
    if (!onSecretOwnerTrigger) return;
    const next = footerClickCount + 1;
    if (next >= 5) {
      setFooterClickCount(0);
      onSecretOwnerTrigger();
    } else {
      setFooterClickCount(next);
    }
  };

  const liveCourses = courses.filter((c) => c.status === 'LIVE');
  const activeSeries = testSeries.filter((t) => t.status === 'Active');

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="text-base font-bold tracking-tight text-slate-900 uppercase whitespace-nowrap shrink-0"
          >
            {settings.instituteName}
          </a>

          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            <a href="#live-exams" className="hover:text-[#0F3CC9] whitespace-nowrap shrink-0">
              Live Exams
            </a>
            <a href="#courses" className="hover:text-[#0F3CC9] whitespace-nowrap shrink-0">
              Courses
            </a>
            <a href="#test-series" className="hover:text-[#0F3CC9] whitespace-nowrap shrink-0">
              Test Series
            </a>
            <a href="#contact" className="hover:text-[#0F3CC9] whitespace-nowrap shrink-0">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuthModal('student', 'signin')}
              className="hidden sm:inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 whitespace-nowrap"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => onOpenAuthModal('student', 'signup')}
              className="hidden sm:inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800 whitespace-nowrap"
            >
              Signup
            </button>
            <button
              type="button"
              onClick={onOpenLogin}
              className="hidden sm:inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200 whitespace-nowrap"
            >
              Admin Console
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded border border-slate-200 bg-white text-slate-700"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
            <a href="#live-exams" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-xs font-semibold text-slate-700">
              Live Exams
            </a>
            <a href="#courses" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-xs font-semibold text-slate-700">
              Courses
            </a>
            <a href="#test-series" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-xs font-semibold text-slate-700">
              Test Series
            </a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-xs font-semibold text-slate-700">
              Contact
            </a>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuthModal('student', 'signin');
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin();
                }}
                className="px-3 py-2 text-xs font-semibold text-white bg-[#0F3CC9] rounded"
              >
                Portal Login
              </button>
            </div>
          </div>
        )}
      </header>

      <main id="top" className="flex-1">
        {/* Hero Split */}
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
                <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#0F3CC9]">
                  {settings.tagline}
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight text-slate-900">
                  {settings.heroTitle}
                </h1>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                  {settings.heroSubtitle}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800 transition-colors"
                  >
                    <span>{settings.primaryCta}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  {liveExams[0] && (
                    <button
                      type="button"
                      onClick={() => onOpenQuickJoin(liveExams[0])}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 border border-slate-300 bg-white rounded hover:bg-slate-50"
                    >
                      <UserPlus className="w-4 h-4 text-[#0F3CC9]" />
                      <span>Quick Join Live Test</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="h-full min-h-[260px] lg:min-h-[360px] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                  <ResilientImage
                    src={PORTAL_IMAGES.heroClassroom}
                    alt="Gurukul Classes classroom"
                    fallbackTitle="Gurukul Classes Classroom"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  {examCount} Live
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Published CBT papers across JEE, NEET, MHT-CET &amp; Boards
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  {questionCount} Qs
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  KaTeX-typeset question bank with step-by-step explanations
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  +4 / −1
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Authentic NTA marking &amp; zero-negative CET exam profiles
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  Instant
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Scorecards, tab-switch logs &amp; printable rank certificates
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Public Live Exams — Quick Join & Shared Links */}
        <section id="live-exams" className="py-12 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                01. Open Live Examinations · Quick Join Enabled
              </p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">
                Active CBT Examinations
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {liveExams.map((exam) => (
                <article
                  key={exam.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-50 text-[#0F3CC9] border border-blue-200 rounded">
                        {exam.code}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {exam.durationMinutes}m
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{exam.title}</h3>
                    <p className="text-[11px] font-mono text-slate-500">
                      {exam.subject || 'PCM'} · Class {exam.targetClass} · {exam.questionIds.length} Qs · +
                      {exam.marksPositive}/{exam.marksNegative}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onOpenQuickJoin(exam)}
                      className="flex-1 py-1.5 px-2.5 text-xs font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded"
                    >
                      Quick Join
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenSharedExam(exam.id)}
                      className="py-1.5 px-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded"
                    >
                      Details
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Published Courses */}
        <section id="courses" className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                  02. Academic Courses · {liveCourses.length} Published
                </p>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                  Structured Classroom &amp; Digital Courses
                </h2>
              </div>
              <button
                type="button"
                onClick={onOpenLogin}
                className="text-xs font-semibold text-[#0F3CC9] hover:underline self-start sm:self-auto"
              >
                Access Student Portal →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {liveCourses.map((course) => (
                <article
                  key={course.id}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="h-40 bg-slate-100 border-b border-slate-200">
                      <ResilientImage
                        src={course.image ?? PORTAL_IMAGES.scienceLab}
                        alt={course.title}
                        fallbackTitle={course.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-5 space-y-2.5">
                      <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                        {course.subjectTag} · {course.duration} · {course.enrolledCount} enrolled
                      </p>
                      <h3 className="text-base font-bold text-slate-900">{course.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{course.description}</p>
                      <ul className="space-y-1 pt-1">
                        {course.highlights.map((h) => (
                          <li key={h} className="flex items-start gap-2 text-xs text-slate-700">
                            <Check className="w-3.5 h-3.5 text-[#0F3CC9] shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
                    <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                      ₹{new Intl.NumberFormat('en-IN').format(course.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onStartCheckout({
                          name: course.title,
                          type: 'Course',
                          amount: course.price,
                        })
                      }
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800"
                    >
                      Enroll via UPI
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Published Test Series */}
        <section id="test-series" className="py-12 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                03. Online Test Series · {activeSeries.length} Active Packages
              </p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">Timed Mock Test Bundles</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activeSeries.map((series) => (
                <article
                  key={series.id}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-2">
                    <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                      {series.category} · {series.mockCount} Mock Tests
                    </p>
                    <h3 className="text-lg font-bold text-slate-900">{series.title}</h3>
                    <p className="text-xs text-slate-600">{series.subtitle}</p>
                    <ul className="space-y-1 pt-1">
                      {series.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2 text-xs text-slate-700">
                          <Check className="w-3.5 h-3.5 text-[#0F3CC9] shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
                    <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                      ₹{new Intl.NumberFormat('en-IN').format(series.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onStartCheckout({
                          name: series.title,
                          type: 'Test Series',
                          amount: series.price,
                        })
                      }
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800"
                    >
                      Buy Test Series
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Contact & Bank Details */}
        <section id="contact" className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                04. Campus &amp; Support
              </p>
              <h2 className="text-xl font-bold text-slate-900">
                {settings.instituteName} Admissions &amp; Portal Desk
              </h2>
              <div className="space-y-2.5 text-xs text-slate-600 pt-1">
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#0F3CC9] shrink-0 mt-0.5" />
                  <span>{settings.address}</span>
                </p>
                <p className="flex items-center gap-2 font-mono">
                  <Phone className="w-4 h-4 text-[#0F3CC9] shrink-0" />
                  <span>{settings.phone}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#0F3CC9] shrink-0" />
                  <a href={`mailto:${settings.email}`} className="text-[#0F3CC9] hover:underline">
                    {settings.email}
                  </a>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Direct Fee &amp; Test Series Payment Details
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-500">UPI ID</p>
                  <p className="font-mono font-semibold text-slate-900 mt-0.5">{settings.upiId}</p>
                </div>
                <div>
                  <p className="text-slate-500">Bank Name</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{settings.bankName}</p>
                </div>
                <div>
                  <p className="text-slate-500">Account Number</p>
                  <p className="font-mono font-semibold text-slate-900 mt-0.5">
                    {settings.accountNo}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">IFSC Code</p>
                  <p className="font-mono font-semibold text-slate-900 mt-0.5">{settings.ifsc}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <span onClick={handleFooterBrandClick} className="font-bold text-slate-900 select-none">
              {settings.instituteName}
            </span>
            {license && (
              <span className="text-[11px] font-mono text-slate-500">
                · Licensed by {license.licensor} ({license.planName} · ₹
                {new Intl.NumberFormat('en-IN').format(license.price)}/{license.billingCycle})
              </span>
            )}
          </div>
          <div className="flex items-center gap-5">
            <button type="button" onClick={onOpenLogin} className="hover:text-slate-900">
              Student &amp; Admin Portal
            </button>
            <a href={`mailto:${settings.email}`} className="hover:text-slate-900">
              {settings.email}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
