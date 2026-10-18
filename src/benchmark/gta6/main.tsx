import {createRoot, hydrateRoot} from 'react-dom/client';
import {Gta6Page} from './Gta6Page';
import '@fontsource-variable/archivo';
import '../../article.css';

const root = document.getElementById('root')!;
const page = <Gta6Page base={import.meta.env.BASE_URL} />;
if (root.hasChildNodes()) hydrateRoot(root, page);
else createRoot(root).render(page);
