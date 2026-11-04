import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Pedido {
  id?: string | number;
  producto: string;
  descripcion?: string;
  cantidad: number;
  estado?: string;
  imageUrl?: string;
  stock?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PedidosService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = environment.api.pedidosUrl;

  /**
   * Genera los encabezados HTTP para la API protegida.
   * En la arquitectura con Spring Boot Resource Server y AWS API Gateway,
   * se envía prioritariamente el Access Token (con los scopes OAuth2 y claims de acceso).
   */
  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken() || this.authService.getIdToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * GET: Obtener la lista de pedidos desde el backend Spring Boot.
   * Admite tanto respuestas en formato List<Pedido> directo como
   * respuestas paginadas de Spring Data (Page<Pedido> con propiedad content).
   */
  getPedidos(): Observable<Pedido[]> {
    if (!this.authService.isAuthenticated()) {
      return throwError(() => ({
        status: 401,
        message: 'Sesión no autenticada en el cliente.'
      }));
    }

    return this.http.get<any>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      map(response => {
        if (Array.isArray(response)) {
          return response;
        }
        if (response && Array.isArray(response.content)) {
          // Page<Pedido> de Spring Data
          return response.content;
        }
        if (response && Array.isArray(response.data)) {
          return response.data;
        }
        if (response && Array.isArray(response.pedidos)) {
          return response.pedidos;
        }
        return [];
      })
    );
  }

  /**
   * POST: Crear un nuevo pedido en la base de datos PostgreSQL a través de Spring Boot.
   * Retorna el pedido con su ID generado por la base de datos.
   */
  crearPedido(pedido: Pedido): Observable<Pedido> {
    if (!this.authService.isAuthenticated()) {
      return throwError(() => ({
        status: 401,
        message: 'Sesión no autenticada. No se puede crear el pedido.'
      }));
    }
    return this.http.post<Pedido>(this.apiUrl, pedido, { headers: this.getHeaders() });
  }

  /**
   * PUT: Actualizar un pedido existente en el backend Spring Boot.
   */
  actualizarPedido(id: string | number, pedido: Pedido): Observable<Pedido> {
    if (!this.authService.isAuthenticated()) {
      return throwError(() => ({
        status: 401,
        message: 'Sesión no autenticada. No se puede actualizar el pedido.'
      }));
    }
    return this.http.put<Pedido>(`${this.apiUrl}/${id}`, pedido, { headers: this.getHeaders() });
  }

  /**
   * DELETE: Eliminar un pedido en el backend Spring Boot.
   */
  eliminarPedido(id: string | number): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      return throwError(() => ({
        status: 401,
        message: 'Sesión no autenticada. No se puede eliminar el pedido.'
      }));
    }
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
