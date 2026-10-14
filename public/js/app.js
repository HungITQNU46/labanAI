renderLayout('nav-home');

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.z = 10;
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const compassGroup = new THREE.Group();
const ring1 = new THREE.Mesh(new THREE.TorusGeometry(3, 0.05, 16, 100), new THREE.MeshPhysicalMaterial({ color: 0x00B4D8, metalness: 0.5, roughness: 0.1, transparent: true, opacity: 0.7 }));
ring1.rotation.x = Math.PI / 2; compassGroup.add(ring1);
const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.02, 16, 100), new THREE.MeshBasicMaterial({ color: 0x7B2CBF, side: THREE.DoubleSide }));
ring2.rotation.x = Math.PI / 3; compassGroup.add(ring2);
const needle = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), new THREE.MeshPhysicalMaterial({ color: 0x10B981, metalness: 0.8, roughness: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.1 }));
needle.scale.set(0.4, 2, 0.4); compassGroup.add(needle);
scene.add(compassGroup);

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5); dirLight.position.set(5, 10, 7); scene.add(dirLight);
const pLight = new THREE.PointLight(0x00B4D8, 2, 50); pLight.position.set(-5, 0, 5); scene.add(pLight);

let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
document.addEventListener('mousemove', (e) => { mouseX = (e.clientX - window.innerWidth / 2) * 0.001; mouseY = (e.clientY - window.innerHeight / 2) * 0.001; });

function animate() {
    requestAnimationFrame(animate);
    ring1.rotation.z -= 0.002; ring2.rotation.y += 0.004; needle.rotation.y -= 0.01;
    targetX = mouseX * 1.5; targetY = mouseY * 1.5;
    compassGroup.rotation.y += 0.05 * (targetX - compassGroup.rotation.y);
    compassGroup.rotation.x += 0.05 * (targetY - compassGroup.rotation.x);
    compassGroup.position.y = Math.sin(Date.now() * 0.001) * 0.3;
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => { camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight); });