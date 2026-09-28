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
  public authService = inject(AuthService);
  private pedidosService = inject(PedidosService);

  usuario = '';
  autenticado = false;
  esAdmin = false;
  cargando = false;
  errorAutenticacion: string | null = null;
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
    // 1. Sincronización reactiva mediante el BehaviorSubject autenticado$ del AuthService
    this.authService.autenticado$.subscribe(isAuth => {
      console.log('[App] Notificación reactiva de autenticación recibida:', isAuth);
      if (isAuth && !this.autenticado) {
        this.verificarSesion();
      }
    });

    // 2. Suscripción a eventos de angular-oauth2-oidc para reactividad inmediata al canjear el código PKCE
    this.authService.events.subscribe(event => {
      console.log('[Auth Event]', event.type);
      if (
        event.type === 'token_received' ||
        event.type === 'token_refreshed' ||
        event.type === 'discovery_document_loaded'
      ) {
        console.log('[Auth Event] Evento de sesión detectado exitosamente:', event.type);
        this.verificarSesion();
      } else if (event.type === 'token_error') {
        console.error('[Auth Event] Error en el intercambio de token:', event);
        if (this.authService.isAuthenticated()) {
          this.verificarSesion();
        } else {
          this.errorAutenticacion = 'Error al procesar el token de autorización. Por favor intente nuevamente.';
        }
      } else if (event.type === 'token_expires') {
        console.warn('[Auth Event] La sesión ha expirado.');
        this.errorAutenticacion = 'Su sesión en AWS Cognito ha expirado. Por favor ingrese nuevamente.';
        this.autenticado = false;
        this.esAdmin = false;
      }
    });

    // 3. Verificación inmediata y comprobaciones escalonadas de seguridad
    this.verificarSesion();
    [150, 350, 600, 1000, 1500].forEach(delay => {
      setTimeout(() => {
        if (!this.autenticado) {
          this.verificarSesion();
        }
      }, delay);
    });

    // 4. Sincronización al resolver la promesa de login PKCE de Cognito
    if (this.authService.tryLoginPromise) {
      this.authService.tryLoginPromise
        .then(() => {
          this.verificarSesion();
        })
        .catch(() => {
          this.verificarSesion();
        });
    }
  }

  login(): void {
    console.log('[App] Invocando inicio de sesión en AWS Cognito mediante this.authService.login()...');
    this.errorAutenticacion = null;
    this.authService.login();
  }

  logout(): void {
    console.log('[App] Cerrando sesión y limpiando estado local...');
    this.authService.logout();
    this.autenticado = false;
    this.usuario = '';
    this.esAdmin = false;
    this.errorAutenticacion = null;
  }

  /**
   * Verifica la validez de la sesión, diagnostica el token en consola y extrae roles
   */
  verificarSesion(): void {
    console.log('[Auth Debug] ==========================================');
    console.log('[Auth Debug] Evaluando estado de sesión con isAuthenticated()...');

    // Evaluación explícita del estado de autenticación
    this.autenticado = this.authService.isAuthenticated();
    console.log('[Auth Debug] this.autenticado =', this.autenticado);

    // Revisar si Cognito envió un parámetro de error en la URL de redirección
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
      const errorType = urlParams.get('error');
      const errorDesc = urlParams.get('error_description') || 'Error desconocido al autenticar en Cognito';
      console.error(`[Auth Debug] ERROR recibido de Cognito en URL: ${errorType} - ${errorDesc}`);
      this.errorAutenticacion = `Error de autenticación: ${errorDesc}`;
    }

    if (this.autenticado) {
      this.usuario = this.authService.getUsername() || 'Usuario Autenticado';
      this.esAdmin = this.authService.isAdmin();
      this.errorAutenticacion = null;

      const claims = this.authService.getIdentityClaims();
      const grupos = claims ? (claims['cognito:groups'] || []) : [];

      console.log('[Auth Debug] Token válido detectado.');
      console.log('[Auth Debug] Nombre / Correo de usuario:', this.usuario);
      console.log('[Auth Debug] Claims decodificados del ID Token:', claims);
      console.log('[Auth Debug] Grupos de Cognito encontrados (claims[\'cognito:groups\']):', grupos);
      console.log('[Auth Debug] ¿Pertenece al grupo \'Admin\' (isAdmin)?:', this.esAdmin);

      if (!this.esAdmin) {
        console.warn('[Auth Debug] ADVERTENCIA: El usuario está autenticado pero NO pertenece al grupo "Admin". Funciones de creación, edición y eliminación restringidas.');
        this.mostrarAlerta(`Bienvenido ${this.usuario}. Tu usuario no pertenece al grupo 'Admin'; operaciones CRUD limitadas a solo lectura.`, 'info');
      } else {
        console.log('[Auth Debug] ÉXITO: Usuario verificado con rol de Administrador. Todas las funciones CRUD habilitadas.');
      }

      // Ejecutar de inmediato la función para que las peticiones HTTP lleven el token cargado
      this.cargarPedidos();
    } else {
      this.usuario = '';
      this.esAdmin = false;
      console.log('[Auth Debug] No se encontró una sesión activa o el token no ha sido procesado aún.');
    }
    console.log('[Auth Debug] Estado final -> autenticado:', this.autenticado, '| esAdmin:', this.esAdmin);
    console.log('[Auth Debug] ==========================================');
  }

  // GET: Cargar pedidos desde API Gateway (únicamente con sesión válida autenticada)
  cargarPedidos(): void {
    if (!this.autenticado || !this.authService.isAuthenticated()) {
      console.warn('[App] Solicitud GET a API Gateway bloqueada: esperando confirmación de sesión válida.');
      return;
    }

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
    if (!this.esAdmin) {
      this.mostrarAlerta('Acceso denegado: Se requiere rol de Administrador (Grupo Admin en Cognito) para crear pedidos.', 'danger');
      return;
    }
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
    if (!this.esAdmin) {
      this.mostrarAlerta('Acceso denegado: Operación de creación reservada exclusivamente para Administradores.', 'danger');
      return;
    }

    if (!this.nuevoPedido.producto || this.nuevoPedido.cantidad < 1 || !this.nuevoPedido.imageUrl) {
      this.mostrarAlerta('Por favor completa todos los campos requeridos, incluyendo la imagen y el stock.', 'danger');
      return;
    }

    const tempId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
    const localOrder: Pedido = {
      ...this.nuevoPedido,
      stock: Number(this.nuevoPedido.stock) || 0,
      id: tempId
    };

    // Actualización local inmediata (simulación reactiva)
    this.pedidos.unshift(localOrder);
    this.cerrarModalNuevo();
    this.mostrarAlerta(`Pedido [${tempId}] registrado correctamente (POST).`, 'success');

    // Envío HTTP real a través del API Gateway
    const backendPayload: Pedido = {
      producto: localOrder.producto,
      cantidad: localOrder.cantidad,
      stock: localOrder.stock,
      imageUrl: localOrder.imageUrl,
      estado: localOrder.estado
    };

    this.pedidosService.crearPedido(backendPayload).subscribe({
      next: (res: any) => {
        console.log('POST completado en backend:', res);
        if (res && res.id) {
          const index = this.pedidos.findIndex(p => p.id === tempId);
          if (index !== -1) {
            this.pedidos[index] = { ...this.pedidos[index], id: res.id };
          }
        }
      },
      error: (err) => console.log('Simulado / backend pendiente de despliegue CRUD:', err)
    });
  }

  // PUT: Apertura de modal y edición de estado
  abrirModalEditar(pedido: Pedido): void {
    if (!this.esAdmin) {
      this.mostrarAlerta('Acceso denegado: Se requiere rol de Administrador (Grupo Admin en Cognito) para editar pedidos.', 'danger');
      return;
    }
    this.pedidoSeleccionado = { ...pedido };
    this.mostrarModalEditar = true;
  }

  cerrarModalEditar(): void {
    this.mostrarModalEditar = false;
    this.pedidoSeleccionado = null;
  }

  guardarEdicionEstado(): void {
    if (!this.esAdmin) {
      this.mostrarAlerta('Acceso denegado: Operación de edición reservada para Administradores.', 'danger');
      return;
    }
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
      error: (err) => console.log('Simulado / backend pendiente de despliegue CRUD:', err)
    });
  }

  // DELETE: Cancelar / Eliminar pedido
  cancelarPedido(id: string | number | undefined): void {
    if (!id) return;
    if (!this.esAdmin) {
      this.mostrarAlerta('Acceso denegado: Se requiere rol de Administrador (Grupo Admin en Cognito) para cancelar pedidos.', 'danger');
      return;
    }

    const confirmar = confirm(`¿Estás seguro de cancelar el pedido con ID ${id}?`);
    if (confirmar) {
      this.pedidos = this.pedidos.filter(p => p.id !== id);
      this.mostrarAlerta(`Pedido [${id}] cancelado y eliminado (DELETE).`, 'danger');

      // Envío HTTP real
      this.pedidosService.eliminarPedido(id).subscribe({
        next: () => console.log('DELETE completado en backend'),
        error: (err) => console.log('Simulado / backend pendiente de despliegue CRUD:', err)
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