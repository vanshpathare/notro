import React from "react";
import { useNavigate } from "react-router-dom";

interface TermsProps {
  onAccept?: () => void;
  showAcceptBar?: boolean;
}

export default function Terms({ onAccept, showAcceptBar = false }: TermsProps) {
  const navigate = useNavigate();

  const handleAgree = () => {
    if (onAccept) {
      onAccept();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="terms-page-wrapper">
      <style>{`
        .terms-page-wrapper {
          min-height: 100vh;
          width: 100%;
          background: #ffffff;
          color: #202124;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-sizing: border-box;
          padding: 0 0 ${showAcceptBar ? "80px" : "40px"} 0;
        }

        .terms-container {
          width: 100%;
          max-width: 760px;
          padding: 32px 24px;
          box-sizing: border-box;
        }

        .terms-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .terms-brand {
          font-size: 1.85rem;
          font-weight: 700;
          color: #1a73e8;
          margin: 0 0 6px 0;
          letter-spacing: -0.5px;
        }

        .terms-title {
          font-size: 1.45rem;
          font-weight: 600;
          color: #202124;
          margin: 0;
        }

        .terms-intro-paragraph {
          font-size: 0.95rem;
          line-height: 1.6;
          color: #3c4043;
          margin: 0 0 16px 0;
        }

        .terms-section {
          margin-top: 28px;
        }

        .terms-section-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #202124;
          margin: 0 0 12px 0;
          letter-spacing: -0.2px;
        }

        .terms-bullet-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .terms-bullet-item {
          display: flex;
          align-items: flex-start;
          font-size: 0.88rem;
          line-height: 1.55;
          color: #4a4d51;
        }

        .terms-bullet-symbol {
          font-size: 1.1rem;
          color: #5f6368;
          margin-right: 12px;
          line-height: 1.35;
          user-select: none;
        }

        .terms-bullet-text strong {
          color: #202124;
          font-weight: 600;
        }

        .terms-bottom-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #ffffff;
          border-top: 1px solid #e0e0e0;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 24px;
          box-sizing: border-box;
          z-index: 100;
        }

        .terms-bar-inner {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-terms-cancel {
          background: none;
          border: none;
          color: #5f6368;
          font-weight: 600;
          font-size: 0.92rem;
          cursor: pointer;
          padding: 10px 18px;
          border-radius: 8px;
          transition: background 0.15s;
        }

        .btn-terms-cancel:hover {
          background: #f1f3f4;
          color: #202124;
        }

        .btn-terms-agree {
          background: #1a73e8;
          color: #ffffff;
          border: none;
          font-weight: 600;
          font-size: 0.92rem;
          padding: 10px 24px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s;
        }

        .btn-terms-agree:hover {
          background: #1557b0;
          box-shadow: 0 1px 3px rgba(60, 64, 67, 0.3);
        }

        @media (max-width: 600px) {
          .terms-container {
            padding: 24px 18px;
          }
          .terms-brand {
            font-size: 1.6rem;
          }
          .terms-title {
            font-size: 1.25rem;
          }
          .terms-intro-paragraph {
            font-size: 0.9rem;
          }
          .terms-section-title {
            font-size: 0.98rem;
          }
          .terms-bullet-item {
            font-size: 0.84rem;
          }
        }
      `}</style>

      <div className="terms-container">
        {/* Top Header */}
        <div className="terms-header">
          <h1 className="terms-brand">Notezho</h1>
          <h2 className="terms-title">Privacy and Terms</h2>
        </div>

        <p className="terms-intro-paragraph">
          To establish an authenticated Notezho account profile and utilize our
          peer-to-peer digital academic repository services, you must review
          and agree to the comprehensive Terms of Service and user covenants
          set forth below.
        </p>

        <p className="terms-intro-paragraph">
          By proceeding with account creation, verifying your credentials, or
          accessing any uploaded academic assets, you explicitly acknowledge
          that Notezho functions exclusively as a technological intermediary
          under applicable safe-harbor legal provisions and digital intermediary
          guidelines.
        </p>

        {/* Section 1 */}
        <div className="terms-section">
          <h3 className="terms-section-title">
            1. Nature of Service & Absolute Intermediary Safe Harbor
          </h3>
          <ul className="terms-bullet-list">
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>Intermediary Status:</strong> Notezho operates strictly
                and exclusively as a decentralized technological intermediary
                and connecting facility between independent users; we do not
                author, create, inspect, endorse, curate, or hold legal title
                to any study materials, lecture summaries, problem solutions,
                formula sheets, or academic transcriptions made available on
                the platform.
              </span>
            </li>
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>No Warranty of Academic Accuracy:</strong> Under no
                circumstances does Notezho, its developers, operators, or
                affiliates assume liability or legal accountability for the
                substantive correctness, factual validity, mathematical
                precision, or academic completeness of any answers, solutions,
                derivations, or formulas contained within uploaded notes.
              </span>
            </li>
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>"As-Is" Provision:</strong> All study assets and
                digital documents are accessed and consumed strictly on an
                "as-is" and "as-available" basis without any express or
                implied representations or warranties regarding passing grades,
                academic performance, syllabus conformity, or university
                curriculum compliance.
              </span>
            </li>
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>Assumption of Risk:</strong> The entirety of the
                operational and academic risk arising from reliance upon the
                materials hosted, purchased, or reviewed on the application
                remains entirely and exclusively with the user, student, or
                purchaser.
              </span>
            </li>
          </ul>
        </div>

        {/* Section 2 */}
        <div className="terms-section">
          <h3 className="terms-section-title">
            2. User Upload Liabilities & Mandatory Account Termination
          </h3>
          <ul className="terms-bullet-list">
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>Sole Responsibility of Account Holders:</strong>{" "}
                Registered account holders bear sole, exclusive, and
                non-delegable civil, regulatory, and criminal liability for all
                digital files, documents, PDFs, handwritten scans,
                descriptions, and metadata uploaded through their authenticated
                profiles.
              </span>
            </li>
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>Warranty of Ownership:</strong> By initiating any
                upload or listing, the user explicitly warrants, represents, and
                covenants that they possess complete, unencumbered intellectual
                property ownership or explicit licensing rights over every
                single page, diagram, and note uploaded.
              </span>
            </li>
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>Zero Tolerance for Infringement:</strong> The uploading
                of third-party copyrighted materials—including but not limited
                to scanned pages of published textbooks, commercial coaching
                modules, institutional course packs, faculty slide
                presentations, or unauthorized university examination question
                papers—is strictly and unequivocally prohibited.
              </span>
            </li>
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>Account Termination & Asset Forfeiture:</strong>{" "}
                Notezho reserves the absolute and unqualified right to
                immediately terminate, suspend, or permanently ban any user
                account, blacklist hardware and device identifiers, and freeze
                or forfeit any unsettled wallet balances or pending payout
                balances if an account holder is detected or credibly reported
                to have uploaded notes or materials that they do not legally
                own.
              </span>
            </li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="terms-section">
          <h3 className="terms-section-title">
            3. Limited Educational License, Non-Transferability & Anti-Piracy
          </h3>
          <ul className="terms-bullet-list">
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>Single-User Study License Only:</strong> Upon
                successful financial consideration and settlement for any
                digital note or document, the purchaser is granted strictly a
                personal, revocable, non-exclusive, and non-transferable
                license to view and reference the document solely for their own
                private educational self-study purposes.
              </span>
            </li>
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>No Transfer of Ownership:</strong> The purchase of
                access to study materials does not transfer any copyright,
                title, ownership rights, or commercial exploitation privileges
                to the buyer.
              </span>
            </li>
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>Strict Prohibition of Resale and Redistribution:</strong>{" "}
                You are expressly, strictly, and unconditionally prohibited
                from reproducing, screen-recording, exporting, reselling,
                sublicensing, broadcasting, or redistributing any purchased
                files, whether electronically, physically, via peer-to-peer
                cloud storage links, or over third-party messaging services such
                as Telegram, WhatsApp, Discord, or public web forums.
              </span>
            </li>
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>Legal Recourse for Piracy:</strong> Any unauthorized
                dissemination, piracy, secondary commercial distribution, or
                pooling of purchased study assets constitutes deliberate
                intellectual property infringement and material breach of
                contract, subjecting the offending user to immediate account
                termination, device banning, and civil claims for damages.
              </span>
            </li>
          </ul>
        </div>

        {/* Section 4 */}
        <div className="terms-section">
          <h3 className="terms-section-title">
            4. Marketplace Commissions & Disbursal Policies
          </h3>
          <ul className="terms-bullet-list">
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>Tiered Commission Schedule:</strong> Notezho charges
                and automatically withholds an administrative platform
                facilitation fee amounting to 20% on all gross transactions
                originated by student accounts, and 12% on all gross
                transactions originated by verified businesses, institutional
                vendors, and approved content creators.
              </span>
            </li>
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>Non-Refundable Purchases:</strong> Because digital
                documents and study notes are immediately accessible and
                downloadable upon completed payment processing, all digital
                purchases are deemed final, non-cancellable, and strictly
                non-refundable, except in certified cases of unreadable file
                corruption verified by support within 24 hours of purchase.
              </span>
            </li>
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>Payout Thresholds:</strong> Seller earnings are
                remitted directly to the account holder's registered UPI ID
                subject to standard holding windows, fraud checks, and minimum
                account balance thresholds.
              </span>
            </li>
          </ul>
        </div>

        {/* Section 5 */}
        <div className="terms-section">
          <h3 className="terms-section-title">
            5. Account Integrity & Device Monitoring
          </h3>
          <ul className="terms-bullet-list">
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>Single Active Session Security:</strong> To safeguard
                your purchased study library, prevent unauthorized commercial
                account sharing, and preserve marketplace integrity, our systems
                log unique device identifiers and restrict active authenticated
                app sessions to a single verified handset per account.
              </span>
            </li>
            <li className="terms-bullet-item">
              <span className="terms-bullet-symbol">•</span>
              <span className="terms-bullet-text">
                <strong>Data Processing:</strong> Verified mobile numbers and
                account records are managed under industry-standard
                cryptographic frameworks strictly for authentication, account
                reactivation, and service continuity.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Optional Sticky Bottom Action Bar (similar to Compose bottomBar) */}
      {showAcceptBar && (
        <div className="terms-bottom-bar">
          <div className="terms-bar-inner">
            <button
              type="button"
              className="btn-terms-cancel"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-terms-agree"
              onClick={handleAgree}
            >
              I agree
            </button>
          </div>
        </div>
      )}
    </div>
  );
}