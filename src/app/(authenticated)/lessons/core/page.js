import LessonsExplorer from '~/components/LessonsExplorer';

export default function CoreLessonsPage() {
  return (
    <LessonsExplorer
      pageTitle="Playbooks"
      pageDescription="Focused sessions that align with the core Rainmaker curriculum."
      moduleType="core"
      moduleTitle="Playbooks"
      emptyStateMessage="No core lessons are available yet."
      showSubNav={false}
    />
  );
}
