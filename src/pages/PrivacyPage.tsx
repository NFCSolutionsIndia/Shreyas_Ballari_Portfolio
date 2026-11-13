import { PagePlaceholder } from '@/app/PagePlaceholder';
import { Container } from '@/components/layout/Container';
import { HEADSET_CREDIT } from '@/content/credits';

export function Component() {
  return (
    <>
      <PagePlaceholder
        title="Privacy"
        description="What the contact form stores, for how long, and why this site uses no tracking cookies."
      />
      {/* Credits the licences require (shown here instead of over the intro). */}
      <Container>
        <section aria-labelledby="credits-h" className="pb-16">
          <h2 id="credits-h" className="title-2">
            Credits
          </h2>
          <ul className="body-6 mt-2 list-disc pl-5">
            <li>
              “{HEADSET_CREDIT.title}” 3D model by{' '}
              <a className="underline" href={HEADSET_CREDIT.url} target="_blank" rel="noreferrer">
                {HEADSET_CREDIT.author}
              </a>
              , licensed {HEADSET_CREDIT.license}.
            </li>
            <li>House furniture, textures and sky from Poly Haven (CC0).</li>
          </ul>
        </section>
      </Container>
    </>
  );
}
