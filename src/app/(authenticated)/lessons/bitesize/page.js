import LessonsExplorer from '~/components/LessonsExplorer';

export default function BitesizeLessonsPage() {
  return (
    <LessonsExplorer
      pageTitle="Bitesize Webinars"
      pageDescription="Fast learning sessions on key BDM topics."
      moduleType="bitesize"
      emptyStateMessage="No bitesize lessons are available yet."
      showSubNav={false}
    />
  );
}
