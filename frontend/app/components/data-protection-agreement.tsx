import React, { useRef, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DataProtectionAgreementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReadComplete?: () => void;
}

export const DataProtectionAgreement: React.FC<DataProtectionAgreementProps> = ({
  open,
  onOpenChange,
  onReadComplete,
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hasReadComplete, setHasReadComplete] = useState(false);

  const currentDate = new Date();
  const day = currentDate.getDate();
  const month = currentDate.toLocaleString("default", { month: "long" });
  const year = currentDate.getFullYear();

  useEffect(() => {
    if (!open) {
      setHasReadComplete(false);
      return;
    }

    let scrollElement: HTMLElement | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    const findScrollElement = (): HTMLElement | null => {
      if (!scrollAreaRef.current) return null;

      return (
        (scrollAreaRef.current.querySelector(
          '[data-slot="scroll-area-viewport"]'
        ) as HTMLElement) ||
        (scrollAreaRef.current.querySelector(
          '[data-radix-scroll-area-viewport]'
        ) as HTMLElement) ||
        null
      );
    };

    const handleScroll = () => {
      if (hasReadComplete) {
        return;
      }

      const element = scrollElement || findScrollElement();
      if (!element || !contentRef.current) {
        return;
      }

      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;

      // Calculate distance from bottom
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      
      // Consider read complete when user scrolls to within 200px of bottom
      // Using a larger threshold to account for any padding/margin issues and rounding
      const threshold = 200;
      // Also check if scrollHeight is close to clientHeight (content fits in viewport)
      const contentFits = scrollHeight <= clientHeight + 10;
      const isNearBottom = distanceFromBottom <= threshold || contentFits;

      if (isNearBottom && !hasReadComplete) {
        setHasReadComplete(true);
        if (onReadComplete) {
          onReadComplete();
        }
      }
    };

    // Wait for the dialog to fully render before attaching scroll listener
    const timeoutId = setTimeout(() => {
      scrollElement = findScrollElement();

      if (scrollElement) {
        scrollElement.addEventListener("scroll", handleScroll, { passive: true });
        // Check immediately and periodically to catch any missed scroll events
        handleScroll();
        intervalId = setInterval(handleScroll, 250);
      }
    }, 400);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (scrollElement) {
        scrollElement.removeEventListener("scroll", handleScroll);
      }
    };
  }, [open, hasReadComplete, onReadComplete]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            DATA PROTECTION AND CONFIDENTIALITY CONSENT AGREEMENT
          </DialogTitle>
          <DialogDescription className="text-center">
            of MARRIED (PRIVATE) LIMITED
          </DialogDescription>
          <DialogDescription className="text-center">
            Company Registration Number: P V 00216115
          </DialogDescription>
          {!hasReadComplete && (
            <DialogDescription className="text-center text-amber-600 dark:text-amber-500 font-medium">
              Please scroll to the bottom to read the complete agreement
            </DialogDescription>
          )}
          {hasReadComplete && (
            <DialogDescription className="text-center text-green-600 dark:text-green-500 font-medium">
              ✓ Agreement read completely
            </DialogDescription>
          )}
        </DialogHeader>
        <ScrollArea ref={scrollAreaRef} className="max-h-[70vh] pr-4">
          <div ref={contentRef} className="space-y-4 text-sm leading-relaxed pb-6">
            <p className="text-xs text-muted-foreground italic">
              (Hereinafter referred to as 'the Company')
            </p>
            <p className="text-xs text-muted-foreground">
              Including and applying to all subsidiaries and affiliated brands:
              Bloonsoo.com (Hotel Booking System), Abboode.com (Payment Gateway),
              Aipicedit.com (Photo Editor System), Travelonehub.com,
              Investingoo.com, Dolceimperiale.com, Marriex (Business Portfolio),
              and all official Facebook pages and digital assets owned or
              operated under the Company's authority.
            </p>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">1. PREAMBLE</h3>
              <p>
                This Data Protection and Confidentiality Consent Agreement
                ('Agreement') is made and entered into by and between Married
                (PVT) Ltd, a company duly incorporated under the laws of Sri
                Lanka under company registration number P V 00216115 ('the
                Company'), and each of its employees, contractors, business
                partners, participants, vendors, service providers, subsidiaries,
                and associated entities ('the Parties'). The Agreement is
                executed in accordance with the laws of Sri Lanka, including the
                Intellectual Property Act No. 36 of 2003, to protect all forms
                of information, data, intellectual property, business processes,
                systems, technologies, and client information belonging to or
                managed by the Company and its subsidiaries.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">2. DEFINITIONS</h3>
              <p>
                <strong>Confidential Information</strong> means all non-public
                information, whether written, electronic, oral, or otherwise,
                pertaining to the Company. <strong>Data</strong> includes all
                digital or physical information maintained by or on behalf of the
                Company. <strong>Intellectual Property</strong> refers to all
                works, inventions, designs, and trade secrets owned or managed by
                the Company under the Intellectual Property Act No. 36 of 2003.
                <strong> Employee or Contractor</strong> includes any person
                working under employment or contract. <strong>Third Party</strong>{" "}
                refers to any external organisation engaged in business with the
                Company.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">3. PURPOSE AND SCOPE</h3>
              <p>
                This Agreement establishes the obligations of all Parties to
                maintain confidentiality and protect data and proprietary
                information. It applies to all employees, contractors, and
                partners engaged in any capacity with the Company, whether
                on-site, remotely, or digitally.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">
                4. CONSENT AND ACKNOWLEDGEMENT
              </h3>
              <p>
                By signing this Agreement, the Party consents to be bound by its
                terms, agrees not to disclose any Company data, and acknowledges
                the Company's right to monitor systems to ensure compliance.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">
                5. CONFIDENTIALITY OBLIGATIONS
              </h3>
              <p>
                All Parties shall treat Company data as confidential, not
                disclosing any information during or after engagement. Breach may
                result in disciplinary action or legal proceedings.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">
                6. DATA PROTECTION AND STORAGE
              </h3>
              <p>
                All Company data must be stored and transmitted securely. Parties
                are prohibited from transferring data to unauthorised systems and
                must use approved security measures.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">
                7. INTELLECTUAL PROPERTY RIGHTS
              </h3>
              <p>
                All intellectual property created under the Company's employment
                or contract is owned solely by the Company, including works
                related to Bloonsoo.com, Abboode.com, Aipicedit.com,
                Travelonehub.com, Investingoo.com, Dolceimperiale.com, Marriex,
                and all Facebook pages.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">
                8. NON-DISCLOSURE OF COMPANY DATA
              </h3>
              <p>
                No Party shall share or publish any Company data or business
                strategy externally. Breach constitutes grounds for termination
                and legal action.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">
                9. THIRD-PARTY AND PARTNER OBLIGATIONS
              </h3>
              <p>
                All partners must execute this Agreement or similar undertakings.
                Each Party is responsible for ensuring compliance among its
                personnel and agents.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">
                10. DATA BREACH AND ENFORCEMENT
              </h3>
              <p>
                The Company may pursue civil and criminal action in Sri Lanka and
                internationally for data breaches, seeking damages and legal
                remedies.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">
                11. RETURN AND DESTRUCTION OF INFORMATION
              </h3>
              <p>
                Upon termination, the Party must return or destroy all Company
                materials and confirm deletion of data in their possession.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">
                12. DURATION AND SURVIVAL
              </h3>
              <p>
                This Agreement remains effective throughout engagement and
                continues indefinitely concerning confidentiality and IP
                obligations.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">
                13. GOVERNING LAW AND JURISDICTION
              </h3>
              <p>
                This Agreement is governed by the laws of Sri Lanka. Disputes
                shall fall under the exclusive jurisdiction of Sri Lankan courts.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">
                14. COMPANY RIGHTS AND REMEDIES
              </h3>
              <p>
                The Company may suspend access, terminate contracts, or initiate
                legal action upon breach. Rights are cumulative and non-exclusive.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">15. SEVERABILITY</h3>
              <p>
                If any provision is invalid, others remain effective. The
                Agreement's intent shall not be affected by partial invalidity.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">
                16. ENTIRE AGREEMENT
              </h3>
              <p>
                This Agreement constitutes the entire understanding between
                Parties and supersedes previous communications. Modifications must
                be in writing.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mt-6 mb-2">
                17. CONSENT DECLARATION
              </h3>
              <p>
                By signing below, each Party acknowledges understanding and
                acceptance of all terms herein, aware of legal consequences of
                breach.
              </p>
            </section>

            <div className="mt-8 space-y-6 border-t pt-6">
              <p className="text-center font-semibold">
                Executed and Agreed on this {day} day of {month}, {year}
              </p>

              <div className="space-y-4">
                <div>
                  <p className="font-semibold mb-2">
                    For and on behalf of Married (PVT) Ltd
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Company Registration No: P V 00216115
                  </p>
                  <div className="mt-4 space-y-2">
                    <p>Signature: ___________________________</p>
                    <p>Name: _______________________________</p>
                    <p>Designation: _________________________</p>
                    <p>Date: ________________________________</p>
                  </div>
                </div>

                <div className="border-t pt-4 pb-2">
                  <p className="font-semibold mb-2">
                    Employee / Contractor / Partner Declaration:
                  </p>
                  <p className="text-sm mb-4">
                    I, the undersigned, confirm I have read and understood the
                    terms of this Agreement and agree to be bound by them.
                  </p>
                  <div className="space-y-2">
                    <p>Signature: ___________________________</p>
                    <p>Full Name: __________________________</p>
                    <p>Designation / Company: _______________</p>
                    <p>Date: _______________________________</p>
                    <p className="pb-2">Witness Signature: ___________________</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

