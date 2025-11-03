import LessonsExplorer from '~/components/LessonsExplorer';

export default function FavouriteLessonsPage() {
  return (
    <LessonsExplorer
      pageTitle="Favourite Lessons"
      pageDescription="The lessons you have bookmarked for quick access."
      showFavouritesOnly
      emptyStateMessage="You have not marked any lessons as favourites yet."
    />
  );
}
