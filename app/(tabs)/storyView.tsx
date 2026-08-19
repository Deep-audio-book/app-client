import { useLocalSearchParams } from 'expo-router';

import StoryGridView from '@/components/story/Story-grid-viewall';
import StoryViewAll from '@/components/story/Story-list-viewall';

type ApiStory = {
  id: number;
  title: string;
  [key: string]: any;
};

export default function StoryView() {
  const { view_type, title, stories } = useLocalSearchParams<{
    view_type?: string;
    title?: string;
    stories?: string;
  }>();

  let storyData: ApiStory[] = [];

  try {
    storyData = stories ? JSON.parse(stories) : [];
  } catch (error) {
    console.log('Error parsing stories:', error);
  }

  if (view_type === 'grid') {
    return (
      <StoryGridView
        title={title ?? ''}
        stories={storyData}
      />
    );
  }

  return (
    <StoryViewAll
      title={title ?? ''}
      stories={storyData}
    />
  );
}