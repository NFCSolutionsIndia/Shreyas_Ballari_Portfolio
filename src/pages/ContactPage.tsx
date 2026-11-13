import { Seo } from '@/components/seo/Seo';
import { ContactPanel } from '@/features/details/Contact';
import '@/features/details/style';

/** /contact: the same contact panel the tabs open in place. */
export function Component() {
  return (
    <>
      <Seo title="Contact" description="Send Shreyas Ballari a message about his research, his projects or tutoring." />
      <div className="dt dt--page is-static">
        <ContactPanel />
      </div>
    </>
  );
}
