import LessonsExplorer from '~/components/LessonsExplorer';

export default function StoriesPage() {
  return (
    <LessonsExplorer
      pageTitle="Standout Stories"
      pageDescription="Discover success stories from Rainmaker teams and partners across the globe."
      moduleType="stories"
      emptyStateMessage="No stories are available yet."
    />
  );
}
