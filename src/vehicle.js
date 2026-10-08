// ============================================================
// vehicle.js — 4x4 safari tipo Land Rover Defender
// Modelo procedural + salpicadero interior para vista 1ª persona
// ============================================================
import * as THREE from 'three';

export function buildSafariVehicle() {
  const group = new THREE.Group();
  group.userData.species = 'vehicle';

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xd8d4c8, // Verde oliva claro / beige safari
    roughness: 0.5,
    metalness: 0.4
  });
  const metalDark = new THREE.MeshStandardMaterial({
    color: 0x3a2818, roughness: 0.7
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xa8c0c8,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    // Se conduce mirando a través del parabrisas: con 0.55 teñía media vista
    opacity: 0.15
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x1a1410, roughness: 0.95
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x0a0808, roughness: 1
  });
  const interiorMat = new THREE.MeshStandardMaterial({
    color: 0x4a3a28, roughness: 1
  });

  // ============ CARROZQUE (chasis) ============
  // Base
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.5, 4.2),
    metalDark
  );
  chassis.position.y = 0.55;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // Capó + cabina en una pieza
  const bodyGeo = new THREE.BoxGeometry(2.1, 1.0, 4.0);
  const body = new THREE.Mesh(bodyGeo, metalMat);
  body.position.set(0, 1.3, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Capó elevado (delantero)
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.5, 1.4),
    metalMat
  );
  hood.position.set(0, 1.55, 1.4);
  hood.castShadow = true;
  group.add(hood);

  // Parabrisas (inclinado)
  const windshield = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 1.0),
    glassMat
  );
  windshield.position.set(0, 1.95, 0.75);
  windshield.rotation.x = -Math.PI / 6;
  group.add(windshield);

  // Marco parabrisas (tubos negros)
  const windshieldFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.08, 0.08),
    metalDark
  );
  windshieldFrame.position.set(0, 2.45, 0.55);
  windshieldFrame.rotation.x = -Math.PI / 6;
  group.add(windshieldFrame);

  // Ventanas laterales (conductor y pasajero)
  for (const s of [-1, 1]) {
    const sideWindow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 0.8),
      glassMat
    );
    sideWindow.rotation.y = s * Math.PI / 2;
    sideWindow.position.set(s * 1.06, 1.95, 0.2);
    group.add(sideWindow);
    // Marco
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.85, 1.05),
      metalDark
    );
    frame.position.set(s * 1.05, 1.95, 0.2);
    group.add(frame);
  }

  // Ventana trasera
  const rearWindow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 0.9),
    glassMat
  );
  rearWindow.rotation.y = Math.PI;
  rearWindow.position.set(0, 1.95, -0.6);
  group.add(rearWindow);

  // Techo (lona enrollable / techo rígido)
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.18, 2.4),
    metalDark
  );
  roof.position.set(0, 2.45, 0);
  group.add(roof);

  // Barras de techo (rack safari)
  for (let i = -1; i <= 1; i++) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(2.15, 0.06, 0.08),
      metalDark
    );
    bar.position.set(0, 2.6, i * 0.8);
    group.add(bar);
  }

  // Faros delanteros
  for (const s of [-1, 1]) {
    const headlight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12),
      new THREE.MeshStandardMaterial({
        color: 0xfff8e0,
        emissive: 0xfff0c0,
        emissiveIntensity: 0.6
      })
    );
    headlight.rotation.x = Math.PI / 2;
    headlight.position.set(s * 0.8, 1.2, 2.2);
    group.add(headlight);
    // Marco del faro
    const hlFrame = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.02, 6, 16),
      metalDark
    );
    hlFrame.rotation.y = Math.PI / 2;
    hlFrame.position.set(s * 0.8, 1.2, 2.2);
    group.add(hlFrame);
  }

  // Parrilla frontal
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.4, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.8 })
  );
  grille.position.set(0, 1.3, 2.18);
  group.add(grille);
  // Slats
  for (let i = -3; i <= 3; i++) {
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.05, 0.02),
      metalMat
    );
    slat.position.set(0, 1.3 + i * 0.06, 2.21);
    group.add(slat);
  }

  // Parachoques delantero
  const bumperFront = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.25, 0.2),
    metalDark
  );
  bumperFront.position.set(0, 0.7, 2.25);
  bumperFront.castShadow = true;
  group.add(bumperFront);

  // Parachoques trasero
  const bumperRear = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.25, 0.2),
    metalDark
  );
  bumperRear.position.set(0, 0.7, -2.25);
  bumperRear.castShadow = true;
  group.add(bumperRear);

  // Ruedas
  const wheels = [];
  const wheelPositions = [
    { x: -1.05, z: 1.4, name: 'FL' },
    { x:  1.05, z: 1.4, name: 'FR' },
    { x: -1.05, z: -1.4, name: 'BL' },
    { x:  1.05, z: -1.4, name: 'BR' }
  ];
  for (const p of wheelPositions) {
    const wheelGroup = new THREE.Group();
    const tire = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.18, 10, 16),
      tireMat
    );
    tire.rotation.x = Math.PI / 2;
    wheelGroup.add(tire);
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.2, 12),
      wheelMat
    );
    rim.rotation.x = Math.PI / 2;
    wheelGroup.add(rim);
    // Detalles del rim
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.18, 0.05),
        metalMat
      );
      spoke.position.set(
        Math.cos(i / 5 * Math.PI * 2) * 0.16,
        Math.sin(i / 5 * Math.PI * 2) * 0.16,
        0
      );
      spoke.rotation.z = i / 5 * Math.PI * 2;
      wheelGroup.add(spoke);
    }
    wheelGroup.position.set(p.x, 0.42, p.z);
    wheelGroup.userData.name = p.name;
    wheelGroup.userData.isWheel = true;
    group.add(wheelGroup);
    wheels.push(wheelGroup);
  }
  group.userData.wheels = wheels;

  // Tubo de escape
  const exhaust = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8),
    metalDark
  );
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(-0.9, 0.4, -2.1);
  group.add(exhaust);

  // Side steps (estribos laterales)
  for (const s of [-1, 1]) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.08, 2.4),
      metalDark
    );
    step.position.set(s * 1.15, 0.35, 0);
    group.add(step);
  }

  // Espejos laterales
  for (const s of [-1, 1]) {
    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.18, 0.28),
      metalDark
    );
    mirror.position.set(s * 1.18, 1.65, 1.5);
    group.add(mirror);
    const mirrorGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.14),
      glassMat
    );
    mirrorGlass.position.set(s * 1.21, 1.65, 1.5);
    mirrorGlass.rotation.y = s * Math.PI / 2;
    group.add(mirrorGlass);
  }

  // Antena (para radio safari)
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4),
    metalDark
  );
  antenna.position.set(-0.85, 2.95, -0.3);
  group.add(antenna);

  // ============ INTERIOR (para vista 1ª persona) ============
  // Se posiciona en world-space, no en local-space del coche
  // El salpicadero está dentro del habitáculo
  const interior = new THREE.Group();
  interior.userData.isInterior = true;

  // Asientos (conductor y pasajero)
  const seatGeo = new THREE.BoxGeometry(0.55, 0.7, 0.5);
  const seatBackGeo = new THREE.BoxGeometry(0.55, 0.85, 0.1);

  for (const s of [-1, 1]) {
    const seat = new THREE.Mesh(seatGeo, interiorMat);
    seat.position.set(s * 0.55, 1.0, 0.6);
    seat.castShadow = true;
    interior.add(seat);
    const back = new THREE.Mesh(seatBackGeo, interiorMat);
    // Detrás del asiento (el frente del 4×4 es +z): en z 0.85 quedaba delante de los ojos
    back.position.set(s * 0.55, 1.55, 0.3);
    back.castShadow = true;
    interior.add(back);
  }

  // Asientos traseros (banco)
  const rearSeat = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.65, 0.45),
    interiorMat
  );
  rearSeat.position.set(0, 1.0, -0.7);
  rearSeat.castShadow = true;
  interior.add(rearSeat);
  const rearBack = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.85, 0.1),
    interiorMat
  );
  rearBack.position.set(0, 1.55, -0.95);
  rearBack.castShadow = true;
  interior.add(rearBack);

  // Salpicadero
  const dash = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.5, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9 })
  );
  dash.position.set(0, 1.4, 1.55);
  dash.castShadow = true;
  interior.add(dash);

  // Contadores (3 círculos)
  for (let i = -1; i <= 1; i++) {
    const gauge = new THREE.Mesh(
      new THREE.CircleGeometry(0.13, 24),
      new THREE.MeshStandardMaterial({
        color: 0xf4e8b8,
        emissive: 0x8a6a28,
        emissiveIntensity: 0.3
      })
    );
    gauge.position.set(i * 0.4, 1.55, 1.4);
    gauge.rotation.x = -Math.PI / 8;
    interior.add(gauge);
  }

  // Volante
  const steeringWheelGroup = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.04, 8, 24),
    metalDark
  );
  steeringWheelGroup.add(ring);
  // 3 radios
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.22, 6),
      metalDark
    );
    spoke.rotation.z = (i / 3) * Math.PI;
    spoke.position.set(
      Math.sin((i / 3) * Math.PI) * 0.11,
      Math.cos((i / 3) * Math.PI) * 0.11,
      0
    );
    steeringWheelGroup.add(spoke);
  }
  // Centro del volante (logo)
  const centerHub = new THREE.Mesh(
    new THREE.CircleGeometry(0.08, 16),
    new THREE.MeshStandardMaterial({ color: 0xc8732b, roughness: 0.8 })
  );
  centerHub.position.z = 0.04;
  steeringWheelGroup.add(centerHub);
  steeringWheelGroup.position.set(-0.55, 1.6, 1.45);
  interior.add(steeringWheelGroup);

  // Palanca de cambios
  const gearStick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.4, 8),
    metalDark
  );
  gearStick.position.set(-0.25, 1.35, 0.8);
  interior.add(gearStick);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x6a4a28, roughness: 0.7 })
  );
  knob.position.set(-0.25, 1.6, 0.8);
  interior.add(knob);

  // Consola central
  const console = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.3, 1.2),
    interiorMat
  );
  console.position.set(-0.25, 0.95, 0.3);
  interior.add(console);

  // Sun visor / espejo retrovisor interior
  const rearMirror = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.1, 0.08),
    metalDark
  );
  rearMirror.position.set(0, 2.3, 1.55);
  interior.add(rearMirror);

  // Polvo en el salpicadero (un par de manchas sutiles)
  // (No — lo dejo limpio)

  group.userData.interior = interior;
  group.userData.steeringWheel = steeringWheelGroup;
  return group;
}