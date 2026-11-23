renderLayout('nav-home');

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.z = 10;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const compassGroup = new THREE.Group();

// 1. Vòng ngoài: Xanh Cyan Pha Lê (có độ bóng kim loại và không bị cháy trắng)
const ring1 = new THREE.Mesh(
    new THREE.TorusGeometry(3, 0.055, 24, 120),
    new THREE.MeshPhysicalMaterial({
        color: 0x00D2FF,
        emissive: 0x0077B6,
        emissiveIntensity: 0.35,
        metalness: 0.4,
        roughness: 0.15,
        clearcoat: 1.0,
        transparent: true,
        opacity: 0.92
    })
);
ring1.rotation.x = Math.PI / 2;
compassGroup.add(ring1);

// 2. Vòng trong: Tím Lavender 3D (đổi sang PhysicalMaterial để có khối tròn 3D thay vì phẳng)
const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.04, 20, 100),
    new THREE.MeshPhysicalMaterial({
        color: 0xC084FC,
        emissive: 0x7B2CBF,
        emissiveIntensity: 0.4,
        metalness: 0.35,
        roughness: 0.2,
        clearcoat: 1.0
    })
);
ring2.rotation.x = Math.PI / 3;
compassGroup.add(ring2);

// 3. Kim la bàn: Giữ nguyên OctahedronGeometry gốc nhưng phối màu chuyển sắc 3D
// (Đỉnh trên Xanh Ngọc Bích -> Giữa Cyan -> Đỉnh dưới Tím Amethyst + vát cạnh 3D rõ nét)
const needleGeo = new THREE.OctahedronGeometry(1.2, 0);
const posAttr = needleGeo.attributes.position;
const colors = [];
const colorTop = new THREE.Color(0x00F5A0);    // Đỉnh trên: Xanh lá ngọc bích sáng
const colorMid = new THREE.Color(0x00D2FF);    // Vành giữa: Xanh Cyan pha lê
const colorBottom = new THREE.Color(0xA855F7); // Đỉnh dưới: Tím Lavender neon

for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i);
    const c = y > 0.1 ? colorTop : (y < -0.1 ? colorBottom : colorMid);
    colors.push(c.r, c.g, c.b);
}
needleGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

const needle = new THREE.Mesh(
    needleGeo,
    new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        emissive: 0x0A192F,
        emissiveIntensity: 0.2,
        metalness: 0.25,
        roughness: 0.18,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        flatShading: true // Giữ các mặt vát kim cương 3D sắc nét, tách biệt mảng sáng - tối
    })
);
needle.scale.set(0.4, 2, 0.4);
compassGroup.add(needle);

// 4. Hệ thống các chấm tròn 3D li ti (Stardust Orbs) bay lơ lửng xung quanh la bàn
const particlesGroup = new THREE.Group();
const particleColors = [0x00F5D4, 0x38BDF8, 0xC084FC, 0x34D399, 0xFFFFFF];
const particlesData = [];

for (let i = 0; i < 42; i++) {
    const radius = 0.03 + Math.random() * 0.055; // Kích thước chấm tròn 3D lớn nhỏ tự nhiên
    const color = particleColors[i % particleColors.length];

    const dot = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 12, 12),
        new THREE.MeshPhysicalMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.65,
            roughness: 0.1,
            clearcoat: 1.0
        })
    );

    // Phân bố ngẫu nhiên trong không gian 3D bao quanh la bàn (bán kính từ 2.0 đến 4.2)
    const dist = 2.0 + Math.random() * 2.2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = dist * Math.sin(phi) * Math.cos(theta);
    const y = dist * Math.sin(phi) * Math.sin(theta);
    const z = dist * Math.cos(phi);

    dot.position.set(x, y, z);
    particlesGroup.add(dot);

    particlesData.push({
        mesh: dot,
        baseY: y,
        speed: 0.8 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        amp: 0.08 + Math.random() * 0.15
    });
}
compassGroup.add(particlesGroup);
scene.add(compassGroup);

// 5. Hệ thống ánh sáng cân bằng tạo khối 3D rõ rệt (không làm lóa trắng)
scene.add(new THREE.AmbientLight(0xffffff, 0.65));

// Đèn chính chiếu từ góc trên-phải tạo mảng sáng/tối rõ nét trên 8 mặt kim cương
const dirLight = new THREE.DirectionalLight(0xffffff, 1.35);
dirLight.position.set(6, 10, 8);
scene.add(dirLight);

// Đèn viền Cyan bên trái và Tím bên dưới giúp tăng độ sâu 3D
const cyanLight = new THREE.PointLight(0x00E5FF, 1.5, 40);
cyanLight.position.set(-6, 3, 5);
scene.add(cyanLight);

const violetLight = new THREE.PointLight(0xA855F7, 1.5, 40);
violetLight.position.set(6, -4, 5);
scene.add(violetLight);

let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX - window.innerWidth / 2) * 0.001;
    mouseY = (e.clientY - window.innerHeight / 2) * 0.001;
});

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    ring1.rotation.z -= 0.002;
    ring2.rotation.y += 0.004;
    needle.rotation.y -= 0.01;

    // Xoay nhẹ toàn bộ đám mây hạt 3D và cho từng hạt nhấp nhô tự nhiên
    particlesGroup.rotation.y += 0.0025;
    particlesGroup.rotation.x -= 0.001;
    for (let i = 0; i < particlesData.length; i++) {
        const p = particlesData[i];
        p.mesh.position.y = p.baseY + Math.sin(time * p.speed + p.phase) * p.amp;
    }

    targetX = mouseX * 1.5;
    targetY = mouseY * 1.5;
    compassGroup.rotation.y += 0.05 * (targetX - compassGroup.rotation.y);
    compassGroup.rotation.x += 0.05 * (targetY - compassGroup.rotation.x);
    compassGroup.position.y = Math.sin(time) * 0.3;

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});