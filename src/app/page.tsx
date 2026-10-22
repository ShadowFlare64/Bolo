import "./home.css";
import Image from "next/image";
import Link from "next/link";
import { LessonPreview } from "../components/lesson-preview";
import { MobileNavigation } from "../components/mobile-navigation";

export default function Home() {
  return <div className="homepage">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header shell">
      <Link className="brand" href="/" aria-label="Bolo home">bolo<span lang="gu">બોલો</span></Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        <a href="#first-lesson">Your first lesson</a><a href="#how-it-works">About Bolo</a>
        <Link className="button home-primary" href="/learn">Start Learning <span aria-hidden>↗</span></Link>
      </nav>
      <MobileNavigation />
    </header>
    <main id="main" className="shell">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <p className="home-kicker">GUJARATI, FOR EVERYDAY LIFE</p>
          <h1 id="home-title">A little Gujarati.<br />A closer <em>connection.</em></h1>
          <p>From “Kem cho?” to the conversation that follows. Learn useful Gujarati for the people and moments that matter to you.</p>
          <Link className="button home-primary" href="/learn">Start Learning <span aria-hidden>→</span></Link>
          <p className="home-detail">One beginner lesson · About 4 minutes · No account needed</p>
        </div>
        <figure className="home-photo">
          <Image src="/images/everyday-conversation.webp" alt="Two Indian adults sharing a conversation over tea in a café." width={1536} height={1024} sizes="(max-width: 760px) 100vw, 52vw" preload />
          <figcaption><span lang="gu">કેમ છો?</span><span><strong>Kem cho?</strong> How are you?</span></figcaption>
        </figure>
      </section>
      <section id="first-lesson" className="home-demonstration" aria-labelledby="demo-title">
        <div className="home-demo-intro">
          <p className="home-kicker">A LOOK INSIDE · LESSON 01</p>
          <h2 id="demo-title">Your first<br />conversation.</h2>
          <p>Ask how someone is. Tell them you’re well. Say thank you. Start with three phrases you can use today.</p>
          <dl className="home-phrases">
            <div><dt lang="gu">કેમ છો?</dt><dd><strong>Kem cho?</strong><span>How are you?</span></dd></div>
            <div><dt lang="gu">હું મજામાં છું.</dt><dd><strong>Hu majama chhu.</strong><span>I am well.</span></dd></div>
            <div><dt lang="gu">આભાર</dt><dd><strong>Aabhar</strong><span>Thank you</span></dd></div>
          </dl>
          <p className="home-demo-note">Read either script. In the lesson, choose a phrase, build a sentence, and review anything you miss.</p>
        </div>
        <LessonPreview />
      </section>
      <section id="how-it-works" className="home-finale" aria-labelledby="finale-title">
        <div><p className="home-kicker">BEGIN WHERE YOU ARE</p><h2 id="finale-title">New to Gujarati?<br />Or finding your way back?</h2></div>
        <div><p>Romanized text helps you get started; Gujarati script is there when you want it. Your progress is saved in this browser, so you can return and keep practising.</p><Link className="button home-primary" href="/learn">Start your first lesson <span aria-hidden>→</span></Link></div>
      </section>
    </main>
    <footer className="shell home-footer"><Link className="brand" href="/" aria-label="Bolo home">bolo<span lang="gu">બોલો</span></Link><p>Learning content awaiting native-speaker review.<br />Hero photograph generated for Bolo.</p></footer>
  </div>;
}
