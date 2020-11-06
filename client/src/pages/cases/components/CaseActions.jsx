import React from 'react';
import { useTranslation } from 'react-i18next';

const CaseActions = () => {
  const { t } = useTranslation();

  return (
    <>
      <div className="govuk-grid-column-full">
        <h3 className="govuk-heading-m">{t('pages.cases.details-panel.case-actions.heading')}</h3>
      </div>
    </>
  );
};
export default CaseActions;