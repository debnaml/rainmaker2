import LessonsExplorer from '~/components/LessonsExplorer';

export default function FavouriteLessonsPage() {
  return (
    <LessonsExplorer
      pageTitle="Favourites"
      pageDescription="The resources you have bookmarked for quick access."
      showFavouritesOnly
      emptyStateMessage="You have not marked any lessons as favourites yet."
      showSubNav={false}
    />
  );
}
