import { Injectable, inject } from '@angular/core';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private oauthService = inject(OAuthService);

  /**
   * Estado reactivo de autenticación para sincronización inmediata de la interfaz
   */
  public autenticado$ = new BehaviorSubject<boolean>(false);

  /**
   * Promesa que resuelve una vez completada la carga del Discovery Document
   * y el intercambio de código PKCE por tokens
   */
  public tryLoginPromise!: Promise<boolean>;

  /**
   * Flujo de eventos observables de angular-oauth2-oidc
   */
  get events() {
    return this.oauthService.events;
  }

  constructor() {
    this.configureOAuth();
  }

  private configureOAuth(): void {
    const authConfig: AuthConfig = {
      // Emisor OpenID Connect de Cognito
      issuer: environment.cognito.issuer,

      // Endpoint explícito de autorización en Cognito Hosted UI para redirección inmediata sin depender de la red
      loginUrl: `${environment.cognito.domain}/oauth2/authorize`,

      // Endpoint para canje de tokens con PKCE
      tokenEndpoint: `${environment.cognito.domain}/oauth2/token`,

      // Endpoint de información de usuario
      userinfoEndpoint: `${environment.cognito.domain}/oauth2/userInfo`,

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
      // el dominio del Hosted UI, mientras que el issuer es el User Pool ID.
      // strictDiscoveryDocumentValidation, skipIssuerCheck y disableAtHashCheck evitan
      // que la librería descarte tokens válidos devueltos por AWS Cognito.
      strictDiscoveryDocumentValidation: false,
      skipIssuerCheck: true,
      disableAtHashCheck: true,

      // Limpia parámetros y fragmentos de la URL tras el intercambio de código
      clearHashAfterLogin: true
    };

    this.oauthService.configure(authConfig);

    // Escucha eventos del servicio para emitir reactivamente el estado de autenticación
    this.oauthService.events.subscribe(event => {
      console.log('[AuthService Event]', event.type);
      if (
        event.type === 'token_received' ||
        event.type === 'token_refreshed' ||
        event.type === 'discovery_document_loaded'
      ) {
        const isAuth = this.isAuthenticated();
        console.log('[AuthService] Evento detectado:', event.type, '-> isAuthenticated:', isAuth);
        this.autenticado$.next(isAuth);
      }
    });

    // Carga el documento .well-known/openid-configuration de Cognito
    // y si la URL actual contiene el código (?code=...), ejecuta el intercambio por tokens (PKCE)
    this.tryLoginPromise = this.oauthService.loadDiscoveryDocumentAndTryLogin({
      disableNonceCheck: true
    })
      .then((loggedIn) => {
        const isAuth = this.isAuthenticated();
        console.log('[AuthService] Proceso tryLogin completado. Autenticado:', isAuth);
        this.autenticado$.next(isAuth);
        return isAuth;
      })
      .catch(error => {
        console.warn('[AuthService] Advertencia o error en loadDiscoveryDocumentAndTryLogin:', error);
        const isAuth = this.isAuthenticated();
        this.autenticado$.next(isAuth);
        return isAuth;
      });
  }

  /**
   * Inicia el flujo OAuth 2.0 PKCE redirigiendo a la pantalla de login de Cognito (Hosted UI)
   * ejecutando directamente initCodeFlow() del servicio OAuthService de angular-oauth2-oidc
   */
  initCodeFlow(): void {
    console.log('[AuthService] Ejecutando oauthService.initCodeFlow() hacia AWS Cognito...');
    try {
      this.oauthService.initCodeFlow();
    } catch (err) {
      console.warn('[AuthService] Fallback directo a Cognito Hosted UI:', err);
      if (environment.cognito.domain && environment.cognito.clientId) {
        const directUrl = `${environment.cognito.domain}/oauth2/authorize?client_id=${environment.cognito.clientId}&response_type=${environment.cognito.responseType}&scope=${encodeURIComponent(environment.cognito.scope)}&redirect_uri=${encodeURIComponent(environment.cognito.redirectUri)}`;
        window.location.href = directUrl;
      }
    }
  }

  /**
   * Inicia el flujo OAuth 2.0 PKCE delegando en initCodeFlow()
   */
  login(): void {
    this.initCodeFlow();
  }

  /**
   * Cierra la sesión limpiando el almacenamiento local de tokens
   * y redirigiendo al endpoint /logout de Cognito para invalidar la sesión del navegador
   */
  logout(): void {
    this.oauthService.logOut();

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('id_token');
      sessionStorage.removeItem('expires_at');
      sessionStorage.removeItem('id_token_claims_obj');
      sessionStorage.removeItem('id_token_expires_at');
    }

    this.autenticado$.next(false);

    if (environment.cognito.domain) {
      const logoutUrl = `${environment.cognito.domain}/logout?client_id=${environment.cognito.clientId}&logout_uri=${encodeURIComponent(environment.cognito.logoutUrl)}`;
      window.location.href = logoutUrl;
    }
  }

  /**
   * Verifica si existe un token válido (ID Token o Access Token)
   */
  isAuthenticated(): boolean {
    if (this.oauthService.hasValidAccessToken() || this.oauthService.hasValidIdToken()) {
      return true;
    }

    const accessToken = this.oauthService.getAccessToken();
    const idToken = this.oauthService.getIdToken();
    if (accessToken || idToken) {
      return true;
    }

    if (typeof sessionStorage !== 'undefined') {
      if (sessionStorage.getItem('access_token') || sessionStorage.getItem('id_token')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Retorna el Access Token (usado comúnmente para APIs protegidas por OAuth Scopes en API Gateway)
   */
  getAccessToken(): string {
    const token = this.oauthService.getAccessToken();
    if (token) return token;
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('access_token') || '';
    }
    return '';
  }

  /**
   * Retorna el ID Token (usado comúnmente en Cognito Authorizers por defecto en API Gateway)
   */
  getIdToken(): string {
    const token = this.oauthService.getIdToken();
    if (token) return token;
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('id_token') || '';
    }
    return '';
  }

  /**
   * Retorna los claims del ID Token decodificado
   */
  getIdentityClaims(): Record<string, any> | null {
    const claims = this.oauthService.getIdentityClaims() as Record<string, any> | null;
    if (claims && Object.keys(claims).length > 0) {
      return claims;
    }

    const rawToken = this.getIdToken() || this.getAccessToken();
    if (rawToken) {
      try {
        const parts = rawToken.split('.');
        if (parts.length === 3) {
          return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        }
      } catch (err) {
        console.warn('[AuthService] Error decodificando claims JWT:', err);
      }
    }

    return null;
  }

  /**
   * Obtiene el identificador o correo del usuario decodificado desde los claims de Cognito.
   * Prioriza el correo electrónico ('email') para la visualización dinámica en la barra superior.
   */
  getUsername(): string {
    const claims = this.getIdentityClaims();
    if (!claims) return '';
    return claims['email'] || claims['cognito:username'] || claims['username'] || claims['sub'] || '';
  }

  /**
   * Valida si el usuario autenticado pertenece al grupo 'Admin' en AWS Cognito
   * leyendo la lista de grupos desde el claim 'cognito:groups' del token decodificado.
   * Permite habilitar o restringir los botones de gestión CRUD en la interfaz.
   */
  isAdmin(): boolean {
    const claims = this.getIdentityClaims();
    if (claims && claims['cognito:groups']) {
      const groups = claims['cognito:groups'];
      if (Array.isArray(groups)) {
        return groups.includes('Admin');
      }
      if (typeof groups === 'string') {
        return groups === 'Admin';
      }
    }

    try {
      const accessToken = this.getAccessToken();
      if (accessToken) {
        const parts = accessToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          const groups = payload['cognito:groups'];
          if (Array.isArray(groups)) {
            return groups.includes('Admin');
          }
          if (typeof groups === 'string') {
            return groups === 'Admin';
          }
        }
      }
    } catch {
      // Ignorar si el token no tiene formato JWT
    }

    return false;
  }
}
