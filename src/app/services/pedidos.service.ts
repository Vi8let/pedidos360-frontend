import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

export interface Pedido {
  id?: string;
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
    // Usamos el Access Token con fallback al ID Token
    const token = this.authService.getAccessToken() || this.authService.getIdToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // GET: Obtener todos los pedidos
  getPedidos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // POST: Crear un nuevo pedido
  crearPedido(pedido: Pedido): Observable<any> {
    return this.http.post(this.apiUrl, pedido, { headers: this.getHeaders() });
  }

  // PUT: Actualizar un pedido existente
  actualizarPedido(id: string, pedido: Pedido): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, pedido, { headers: this.getHeaders() });
  }

  // DELETE: Eliminar un pedido
  eliminarPedido(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
