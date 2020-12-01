import React, { Suspense } from 'react';
import './App.scss';
import { Router, View } from 'react-navi';
import HelmetProvider from 'react-navi-helmet';
import { useTranslation } from 'react-i18next';
import config from 'react-global-configuration';
import Keycloak from 'keycloak-js';
import { KeycloakProvider, useKeycloak } from '@react-keycloak/web';
import { initAll } from 'govuk-frontend';
import Layout from './components/layout';
import routes from './routes';
import ApplicationSpinner from './components/ApplicationSpinner';
import { useFetchStaffId, useFetchTeam } from './utils/hooks';

if (window.ENVIRONMENT_CONFIG) {
  // eslint-disable-next-line no-console
  console.log('Using built version of application');
  config.set(window.ENVIRONMENT_CONFIG);
} else {
  // eslint-disable-next-line no-console
  console.log('Using non-built version of application');
  config.set({
    authClientId: process.env.REACT_APP_AUTH_CLIENT_ID,
    authRealm: process.env.REACT_APP_AUTH_REALM,
    authUrl: process.env.REACT_APP_AUTH_URL,
    productPageUrl: process.env.REACT_APP_PRODUCT_PAGE_URL,
    serviceDeskUrl: process.env.REACT_APP_SERVICE_DESK_URL,
    supportUrl: process.env.REACT_APP_SUPPORT_URL,
    uiEnvironment: process.env.REACT_APP_UI_ENVIRONMENT,
    uiVersion: process.env.REACT_APP_UI_VERSION,
  });
}

const keycloakInstance = new Keycloak({
  realm: config.get('authRealm'),
  url: config.get('authUrl'),
  clientId: config.get('authClientId'),
});
const keycloakProviderInitConfig = {
  onLoad: 'login-required',
};

const RouterView = () => {
  const { t } = useTranslation();
  const [keycloak, initialized] = useKeycloak();

  initAll();
  useFetchTeam();
  useFetchStaffId();

  return initialized ? (
    <Router
      hashScrollBehavior="smooth"
      routes={routes}
      context={{ t, isAuthenticated: keycloak.authenticated }}
    >
      <Layout>
        <View />
      </Layout>
    </Router>
  ) : (
    <ApplicationSpinner translationKey="keycloak.initialising" />
  );
};
const App = () => (
  <Suspense fallback={null}>
    <HelmetProvider>
      <KeycloakProvider keycloak={keycloakInstance} initConfig={keycloakProviderInitConfig}>
        <RouterView />
      </KeycloakProvider>
    </HelmetProvider>
  </Suspense>
);

export default App;
