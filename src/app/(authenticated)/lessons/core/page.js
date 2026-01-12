import LessonsExplorer from '~/components/LessonsExplorer';

export default function CoreLessonsPage() {
  return (
    <LessonsExplorer
      pageTitle="How-to Guides"
      pageDescription="Focused sessions that align with the core Rainmaker curriculum."
      moduleType="core"
      emptyStateMessage="No core lessons are available yet."
      showSubNav={false}
    />
  );
}
