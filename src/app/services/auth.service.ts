import { Injectable, inject } from '@angular/core';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private oauthService = inject(OAuthService);

  constructor() {
    this.configureOAuth();
  }

  private configureOAuth(): void {
    const authConfig: AuthConfig = {
      // Emisor OpenID Connect de Cognito
      issuer: environment.cognito.issuer,

      // URL a la que se redirige tras el login
      redirectUri: environment.cognito.redirectUri,

      // Identificador del App Client en Cognito
      clientId: environment.cognito.clientId,

      // Flujo Authorization Code Grant con PKCE (code_verifier / code_challenge)
      responseType: environment.cognito.responseType,

      // Scopes solicitados
      scope: environment.cognito.scope,

      // Muestra logs útiles en la consola durante desarrollo
      showDebugInformation: true,

      // CRÍTICO PARA COGNITO: Los endpoints de autorización y token están alojados en
      // https://<dominio>.auth.<region>.amazoncognito.com, mientras que el issuer es
      // https://cognito-idp.<region>.amazonaws.com.
      // Por defecto strictDiscoveryDocumentValidation exige que los endpoints comiencen con el issuer,
      // por lo que debe deshabilitarse en Cognito para evitar errores de validación.
      strictDiscoveryDocumentValidation: false,

      // Limpia parámetros y fragmentos de la URL tras el intercambio de código
      clearHashAfterLogin: true
    };

    this.oauthService.configure(authConfig);

    // Carga el documento .well-known/openid-configuration de Cognito
    // y si la URL actual contiene el código (?code=...), ejecuta el intercambio por tokens (PKCE)
    this.oauthService.loadDiscoveryDocumentAndTryLogin().then((loggedIn) => {
      if (loggedIn) {
        console.log('Autenticación exitosa mediante PKCE');
      }
    }).catch(error => {
      console.error('Error cargando el discovery document o procesando el código:', error);
    });

    // Opcional: configurar renovación automática de tokens
    this.oauthService.setupAutomaticSilentRefresh();
  }

  /**
   * Inicia el flujo OAuth 2.0 PKCE redirigiendo a la pantalla de login de Cognito (Hosted UI)
   */
  login(): void {
    this.oauthService.initCodeFlow();
  }

  /**
   * Cierra la sesión limpiando el almacenamiento local de tokens
   * y redirigiendo al endpoint /logout de Cognito para invalidar la sesión del navegador
   */
  logout(): void {
    this.oauthService.logOut();

    if (environment.cognito.domain) {
      const logoutUrl = `${environment.cognito.domain}/logout?client_id=${environment.cognito.clientId}&logout_uri=${encodeURIComponent(environment.cognito.logoutUrl)}`;
      window.location.href = logoutUrl;
    }
  }

  /**
   * Verifica si existe un token válido (ID Token o Access Token)
   */
  isAuthenticated(): boolean {
    return this.oauthService.hasValidAccessToken() || this.oauthService.hasValidIdToken();
  }

  /**
   * Retorna el Access Token (usado comúnmente para APIs protegidas por OAuth Scopes en API Gateway)
   */
  getAccessToken(): string {
    return this.oauthService.getAccessToken();
  }

  /**
   * Retorna el ID Token (usado comúnmente en Cognito Authorizers por defecto en API Gateway)
   */
  getIdToken(): string {
    return this.oauthService.getIdToken();
  }

  /**
   * Retorna los claims del ID Token decodificado
   */
  getIdentityClaims(): Record<string, any> | null {
    return this.oauthService.getIdentityClaims() as Record<string, any> | null;
  }

  /**
   * Obtiene el identificador o nombre de usuario del token decodificado
   */
  getUsername(): string {
    const claims = this.getIdentityClaims();
    if (!claims) return '';
    return claims['cognito:username'] || claims['username'] || claims['email'] || claims['sub'] || '';
  }
}
