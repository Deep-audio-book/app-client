import React from 'react';
import { useTranslation } from 'react-i18next';
import LegalScreen, { LegalSection } from './LegalScreen';

export default function TermsScreen() {
  const { t } = useTranslation();

  const sections: LegalSection[] = [
    {
      heading: t('legal.terms.using.title'),
      paragraphs: [t('legal.terms.using.p1')],
    },
    {
      heading: t('legal.terms.account.title'),
      bullets: [
        t('legal.terms.account.b1'),
        t('legal.terms.account.b2'),
        t('legal.terms.account.b3'),
      ],
    },
    {
      heading: t('legal.terms.content.title'),
      paragraphs: [t('legal.terms.content.p1')],
    },
    {
      heading: t('legal.terms.plans.title'),
      paragraphs: [t('legal.terms.plans.p1')],
    },
    {
      heading: t('legal.terms.availability.title'),
      paragraphs: [t('legal.terms.availability.p1')],
    },
    {
      heading: t('legal.terms.contact.title'),
      paragraphs: [t('legal.terms.contact.p1')],
    },
  ];

  return (
    <LegalScreen
      title={t('profile.terms')}
      updated={t('legal.lastUpdated')}
      intro={t('legal.terms.intro')}
      sections={sections}
    />
  );
}