import Link from "next/link";
import { ConversationScene } from "../components/conversation-scene";

export default function Home() {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header shell">
      <Link className="brand" href="/">bolo<span lang="gu">બોલો</span></Link>
      <nav aria-label="Main navigation">
        <a href="#how-it-works">The first small step</a>
        <Link className="button small" href="/learn">Start Learning <span aria-hidden>→</span></Link>
      </nav>
    </header>
    <main id="main">
      <section className="hero shell">
        <div className="hero-content">
          <p className="eyebrow"><span className="dot" /> A LITTLE GUJARATI GOES A LONG WAY</p>
          <h1>More than words.<br /><span className="headline-accent">Closer to<br />your people.</span></h1>
          <p className="hero-copy">A hello. A how-are-you. A conversation that feels like home. Learn everyday Gujarati, one small lesson at a time.</p>
          <Link className="button hero-cta" href="/learn">Start Learning <span aria-hidden>→</span></Link>
          <p className="hero-details">4 minutes to your first conversation.<br /><span>No account. No pressure. Just a place to begin.</span></p>
        </div>
        <ConversationScene />
      </section>
      <div className="welcome-band"><div className="shell"><span lang="gu" aria-hidden>ક</span><p>First-time learner? Finding your way back?<br /><strong>There’s a place for you here.</strong></p><span className="band-spark" aria-hidden>✳</span></div></div>
      <section id="how-it-works" className="shell course-section">
        <div className="section-heading"><p className="eyebrow">LET’S START TALKING</p><h2>Small lesson.<br /><span>Real-life words.</span></h2><p>Meet a phrase, give it a go, and learn as you go.<br />You don’t have to get everything right to make progress.</p></div>
        <div className="lesson-path">
          <div className="path-stop"><span className="path-number">01</span><div><h3>Meet your first phrases</h3><p>Read in Romanized Gujarati or switch to <span lang="gu">ગુજરાતી</span>.</p></div></div>
          <div className="path-stop"><span className="path-number">02</span><div><h3>Put the words to work</h3><p>Choose a phrase. Build a sentence. Get instant feedback.</p></div></div>
          <div className="path-stop"><span className="path-number">03</span><div><h3>Give mistakes another go</h3><p>Revisit missed questions and finish a little more confident.</p></div></div>
        </div>
        <Link className="lesson-invitation" href="/learn"><span className="invitation-symbol" lang="gu">કેમ છો?</span><div><p className="eyebrow">BEGINNER · LESSON 01</p><h3>Your first conversation</h3><p>Greetings, feeling good, and a little thank you.</p></div><span className="invitation-end"><span>5 exercises · 4 minutes</span><strong>Let’s begin <span aria-hidden>↗</span></strong></span></Link>
      </section>
    </main>
    <footer className="shell site-footer"><Link className="brand" href="/">bolo<span lang="gu">બોલો</span></Link><p>Little by little. Word by word.</p><span>Content awaiting native-speaker review</span></footer>
  </>;
}
