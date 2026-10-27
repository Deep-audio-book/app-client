import React from 'react';
import { useTranslation } from 'react-i18next';
import LegalScreen, { LegalSection } from './LegalScreen';

export default function PrivacyScreen() {
  const { t } = useTranslation();

  const sections: LegalSection[] = [
    {
      heading: t('legal.privacy.collect.title'),
      paragraphs: [t('legal.privacy.collect.p1')],
      bullets: [
        t('legal.privacy.collect.b1'),
        t('legal.privacy.collect.b2'),
        t('legal.privacy.collect.b3'),
      ],
    },
    {
      heading: t('legal.privacy.use.title'),
      bullets: [
        t('legal.privacy.use.b1'),
        t('legal.privacy.use.b2'),
        t('legal.privacy.use.b3'),
        t('legal.privacy.use.b4'),
      ],
    },
    {
      heading: t('legal.privacy.sharing.title'),
      paragraphs: [t('legal.privacy.sharing.p1')],
    },
    {
      heading: t('legal.privacy.choices.title'),
      paragraphs: [t('legal.privacy.choices.p1')],
    },
    {
      heading: t('legal.privacy.changes.title'),
      paragraphs: [t('legal.privacy.changes.p1')],
    },
  ];

  return (
    <LegalScreen
      title={t('profile.privacy')}
      updated={t('legal.lastUpdated')}
      intro={t('legal.privacy.intro')}
      sections={sections}
    />
  );
}