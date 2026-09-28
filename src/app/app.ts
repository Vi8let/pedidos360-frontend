import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';
import { PedidosService, Pedido } from './services/pedidos.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private authService = inject(AuthService);
  private pedidosService = inject(PedidosService);

  usuario = 'Admin Operaciones';
  autenticado = false;
  cargando = false;
  mensajeAlerta: string | null = null;
  tipoAlerta: 'success' | 'danger' | 'info' = 'info';

  // Lista de pedidos con datos simulados iniciales para visualización corporativa
  pedidos: Pedido[] = [
    {
      id: 'ORD-9821',
      producto: 'MacBook Pro 16" M3 Max 36GB',
      descripcion: 'Apple Silicon M3 Max • 36GB Unified Memory',
      cantidad: 2,
      stock: 14,
      estado: 'En preparación',
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=200&q=80'
    },
    {
      id: 'ORD-9822',
      producto: 'Servidor Dell PowerEdge R750',
      descripcion: 'Enterprise Rack 2U • Dual Intel Xeon',
      cantidad: 1,
      stock: 6,
      estado: 'Enviado',
      imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=200&q=80'
    },
    {
      id: 'ORD-9823',
      producto: 'Switch Cisco Catalyst 9200 48P',
      descripcion: 'Managed Gigabit Switch • 48 Puertos PoE+',
      cantidad: 4,
      stock: 28,
      estado: 'Entregado',
      imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=200&q=80'
    },
    {
      id: 'ORD-9824',
      producto: 'GPU PNY NVIDIA RTX 4090 24GB',
      descripcion: 'NVIDIA Ada Lovelace • 24GB GDDR6X',
      cantidad: 3,
      stock: 5,
      estado: 'En preparación',
      imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=200&q=80'
    }
  ];

  // Modales
  mostrarModalNuevo = false;
  mostrarModalEditar = false;

  // Modelo para Crear Pedido (POST)
  nuevoPedido: Pedido = {
    producto: '',
    cantidad: 1,
    stock: 10,
    imageUrl: '',
    estado: 'En preparación'
  };

  // Modelo para Editar Pedido (PUT)
  pedidoSeleccionado: Pedido | null = null;

  ngOnInit(): void {
    this.verificarSesion();
  }

  login(): void {
    this.authService.login();
  }

  logout(): void {
    this.authService.logout();
    this.autenticado = false;
  }

  verificarSesion(): void {
    this.autenticado = this.authService.isAuthenticated();
    if (this.autenticado) {
      this.usuario = this.authService.getUsername() || 'Operador Admin';
      this.cargarPedidos();
    }
  }

  // GET: Cargar pedidos desde API Gateway (o mantener datos locales si no hay respuesta)
  cargarPedidos(): void {
    this.cargando = true;
    this.pedidosService.getPedidos().subscribe({
      next: (data: any) => {
        const respuesta = Array.isArray(data) ? data : (data?.Items || data?.pedidos);
        if (respuesta && respuesta.length > 0) {
          this.pedidos = respuesta;
        }
        this.cargando = false;
        this.mostrarAlerta('Lista de pedidos sincronizada con API Gateway.', 'success');
      },
      error: (err) => {
        console.warn('API Gateway offline o sin conexión directa, operando en modo consola:', err);
        this.cargando = false;
      }
    });
  }

  // POST: Apertura de modal y creación
  abrirModalNuevo(): void {
    this.nuevoPedido = {
      producto: '',
      cantidad: 1,
      stock: 10,
      imageUrl: '',
      estado: 'En preparación'
    };
    this.mostrarModalNuevo = true;
  }

  cerrarModalNuevo(): void {
    this.mostrarModalNuevo = false;
  }

  guardarNuevoPedido(): void {
    if (!this.nuevoPedido.producto || this.nuevoPedido.cantidad < 1 || !this.nuevoPedido.imageUrl) {
      this.mostrarAlerta('Por favor completa todos los campos requeridos, incluyendo la imagen y el stock.', 'danger');
      return;
    }

    const payload: Pedido = {
      ...this.nuevoPedido,
      stock: Number(this.nuevoPedido.stock) || 0,
      id: 'ORD-' + Math.floor(1000 + Math.random() * 9000)
    };

    // Actualización local inmediata (simulación reactiva)
    this.pedidos.unshift(payload);
    this.cerrarModalNuevo();
    this.mostrarAlerta(`Pedido [${payload.id}] registrado correctamente (POST).`, 'success');

    // Envío HTTP real a través del servicio
    this.pedidosService.crearPedido(payload).subscribe({
      next: () => console.log('POST completado en backend'),
      error: (err) => console.log('Simulado: backend pendiente de despliegue CRUD', err)
    });
  }

  // PUT: Apertura de modal y edición de estado
  abrirModalEditar(pedido: Pedido): void {
    this.pedidoSeleccionado = { ...pedido };
    this.mostrarModalEditar = true;
  }

  cerrarModalEditar(): void {
    this.mostrarModalEditar = false;
    this.pedidoSeleccionado = null;
  }

  guardarEdicionEstado(): void {
    if (!this.pedidoSeleccionado || !this.pedidoSeleccionado.id) return;

    const index = this.pedidos.findIndex(p => p.id === this.pedidoSeleccionado!.id);
    if (index !== -1) {
      this.pedidos[index] = { ...this.pedidoSeleccionado };
    }

    const id = this.pedidoSeleccionado.id;
    const body = { ...this.pedidoSeleccionado };
    this.cerrarModalEditar();
    this.mostrarAlerta(`Estado del pedido [${id}] actualizado a "${body.estado}" (PUT).`, 'info');

    // Envío HTTP real
    this.pedidosService.actualizarPedido(id, body).subscribe({
      next: () => console.log('PUT completado en backend'),
      error: (err) => console.log('Simulado: backend pendiente de despliegue CRUD', err)
    });
  }

  // DELETE: Cancelar / Eliminar pedido
  cancelarPedido(id: string | undefined): void {
    if (!id) return;

    const confirmar = confirm(`¿Estás seguro de cancelar el pedido con ID ${id}?`);
    if (confirmar) {
      this.pedidos = this.pedidos.filter(p => p.id !== id);
      this.mostrarAlerta(`Pedido [${id}] cancelado y eliminado (DELETE).`, 'danger');

      // Envío HTTP real
      this.pedidosService.eliminarPedido(id).subscribe({
        next: () => console.log('DELETE completado en backend'),
        error: (err) => console.log('Simulado: backend pendiente de despliegue CRUD', err)
      });
    }
  }

  mostrarAlerta(mensaje: string, tipo: 'success' | 'danger' | 'info'): void {
    this.mensajeAlerta = mensaje;
    this.tipoAlerta = tipo;
    setTimeout(() => {
      if (this.mensajeAlerta === mensaje) {
        this.mensajeAlerta = null;
      }
    }, 4500);
  }
}