import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_C1DQHPBOn',
      userPoolClientId: '5f24qerscjusiu3apprn79gbdc',
      loginWith: {
        oauth: {
          domain: 'us-east-1c1dqhpbon.auth.us-east-1.amazoncognito.com',
          scopes: [
            'email',
            'openid',
            'profile',
            'rs-api-pedidos/pedidos-read'
          ],
          redirectSignIn: [
            'http://localhost:4200'
          ],
          redirectSignOut: [
            'http://localhost:4200'
          ],
          responseType: 'code'
        }
      }
    }
  }
});

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
