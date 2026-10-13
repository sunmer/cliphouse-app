import {Header} from './Header';

export function SiteFooter() {
  return <footer className="site-footer">
      <a href="#/">cliphou.se</a>
      <a href={`${import.meta.env.BASE_URL}benchmark/`}>Benchmark</a>
      <a href={`${import.meta.env.BASE_URL}about/`}>About</a>
      <a href={`${import.meta.env.BASE_URL}license/`}>License</a>
      <a href="#/privacy">Privacy</a>
    </footer>;
}

export function PrivacyPage() {
  return <div className="page">
    <Header />
    <main className="privacy-page">
      <h1>Privacy</h1>
      <h2>Your account and stars</h2>
      <p>Google sign-in uses Firebase Authentication. It provides your account identifier, name, email address, and profile picture. Your starred video IDs and save times are stored in Cloud Firestore under your account. Stars are private, not public ratings.</p>
      <p>Signing out does not delete stars. Unstar a video to remove its bookmark. Account deletion requests must be handled by the service operator.</p>
      <h2>Your edits</h2>
      <p>Anonymous text edits, colors, and your brand colors stay in this browser's local storage. Clearing site data removes them from this device. Save stores a private copy of your edited text, colors, title, and save time in Cloud Firestore under your account. Delete it from Saved videos in your account.</p>
      <p>When you publish a share link, a copy of the edited text and colors and a preview image are stored on Google Cloud. The link is attached to your account. Anyone with the link can view and edit that published copy without signing in. Your Google account details are not included in the public page.</p>
      <p>Later edits do not change an existing link. You can remove a link from Published links in your account. Our cached copies can remain available for up to one minute. Other apps, recipients, and search services may retain their own copies.</p>
      <h2>Analytics</h2>
      <p>When configured, Google Analytics runs automatically when the site loads and receives page views, sign-ins, bookmark actions, and publishing events. It may use first-party cookies to measure visits. We do not send your name, email, account identifier, search terms, share identifiers, or edited video text to Analytics. Google may process device, network, and usage information.</p>
      <p>Advertising storage, Google signals, and advertising personalization are disabled. This site does not show an analytics consent screen.</p>
      <h2>Service providers</h2>
      <p>Hosting providers process requests needed to deliver the site. Google processes account and bookmark data to provide authentication and storage. Essential browser storage keeps your sign-in and edits.</p>
      <a className="link-btn" href="#/">Back to videos</a>
    </main>
  </div>;
}
