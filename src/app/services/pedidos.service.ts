import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Observable, of } from 'rxjs';

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

  private getHeaders(): HttpHeaders {
    // API Gateway protegido por Cognito Authorizer:
    // Se envía el ID Token (estándar para Cognito Authorizer) o Access Token (para Scopes OAuth)
    const token = this.authService.getIdToken() || this.authService.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // GET: Obtener todos los pedidos (bloqueado si no está autenticado para evitar error 401 en API Gateway)
  getPedidos(): Observable<Pedido[]> {
    if (!this.authService.isAuthenticated()) {
      console.warn('[PedidosService] Solicitud GET bloqueada preventivamente: sesión no autenticada para evitar error 401 en API Gateway.');
      return of([]);
    }
    return this.http.get<Pedido[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // POST: Crear un nuevo pedido
  crearPedido(pedido: Pedido): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      console.warn('[PedidosService] Solicitud POST bloqueada: usuario no autenticado.');
      return of(null);
    }
    return this.http.post(this.apiUrl, pedido, { headers: this.getHeaders() });
  }

  // PUT: Actualizar un pedido existente
  actualizarPedido(id: string | number, pedido: Pedido): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      console.warn('[PedidosService] Solicitud PUT bloqueada: usuario no autenticado.');
      return of(null);
    }
    return this.http.put(`${this.apiUrl}/${id}`, pedido, { headers: this.getHeaders() });
  }

  // DELETE: Eliminar un pedido
  eliminarPedido(id: string | number): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      console.warn('[PedidosService] Solicitud DELETE bloqueada: usuario no autenticado.');
      return of(null);
    }
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
