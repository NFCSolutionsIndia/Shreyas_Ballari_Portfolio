import { Seo } from '@/components/seo/Seo';
import { oncure } from '@/content/portfolio';
import { OncureDetails } from '@/features/details/Details';

/** /research/oncure: the full Oncure research concept, with the film. */
export function Component() {
  return (
    <>
      <Seo title="Oncure" description={oncure.pitch} />
      <div className="dt dt--page is-static">
        <OncureDetails />
      </div>
    </>
  );
}
