import LessonsExplorer from '~/components/LessonsExplorer';

export default function BitesizeLessonsPage() {
  return (
    <LessonsExplorer
      pageTitle="Bitesize Webinars"
      pageDescription="Quick, high-impact lessons tailored for fast learning sessions."
      moduleType="bitesize"
      emptyStateMessage="No bitesize lessons are available yet."
      showSubNav={false}
    />
  );
}
