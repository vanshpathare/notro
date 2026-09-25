export default function Terms() {
  const sections = [
    {
      title: "1. About Notezho",
      content: `Notezho is a marketplace connecting students who sell study notes with students who buy them. We are not responsible for the content of notes uploaded by sellers.`,
    },
    {
      title: "2. Eligibility",
      content: `You must be at least 13 years old to use Notezho. By creating an account you confirm you meet this requirement.`,
    },
    {
      title: "3. Seller Responsibilities",
      content: `As a seller you agree that:
- You own the rights to all content you upload
- Your notes do not violate any copyright or intellectual property rights
- Your content is accurate and not misleading
- You will not upload inappropriate, offensive, or illegal content

We reserve the right to remove content that violates these terms and suspend repeat violators.`,
    },
    {
      title: "4. Buyer Responsibilities",
      content: `As a buyer you agree that:
- Purchased notes are for your personal use only
- You will not share, redistribute, or resell purchased notes
- You will not attempt to circumvent DRM protections`,
    },
    {
      title: "5. Payments and Commissions",
      content: `Notezho charges a platform commission on each sale:
- Student sellers: 20% commission
- Business and YouTube accounts: 12% commission

Payments are processed by Razorpay. Payouts are processed manually within 2-3 business days of request.`,
    },
    {
      title: "6. Refund Policy",
      content: `Due to the digital nature of notes, we generally do not offer refunds after purchase. Exceptions are made if the note is significantly different from its description or is blank/corrupted. Contact support within 7 days of purchase.`,
    },
    {
      title: "7. Prohibited Activities",
      content: `You may not:
- Upload copyrighted textbooks you do not own
- Create fake reviews or ratings
- Use the platform for any illegal purpose
- Attempt to hack, disrupt, or damage the platform`,
    },
    {
      title: "8. Intellectual Property",
      content: `Sellers retain ownership of their uploaded notes. By uploading to Notezho you grant us a license to host and display your content on the platform.`,
    },
    {
      title: "9. Limitation of Liability",
      content: `Notezho is provided "as is". We are not liable for any damages arising from your use of the platform, including lost profits or data loss.`,
    },
    {
      title: "10. Governing Law",
      content: `These terms are governed by the laws of India. Disputes shall be resolved in the courts of India.`,
    },
    {
      title: "11. Contact",
      content: `For questions: notezho.app@gmail.com`,
    },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px 60px" }}>
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: 700,
          color: "#1A73E8",
          marginBottom: 8,
        }}
      >
        Terms of Service
      </h1>
      <p style={{ color: "#999", marginBottom: 40 }}>
        Last updated: August 2026
      </p>

      {sections.map((section) => (
        <div key={section.title} style={{ marginBottom: 32 }}>
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              marginBottom: 10,
              color: "#333",
            }}
          >
            {section.title}
          </h2>
          <p style={{ color: "#555", lineHeight: 1.8, whiteSpace: "pre-line" }}>
            {section.content}
          </p>
        </div>
      ))}
    </div>
  );
}
