interface BookerDetails {
  booker_name: string;
  booker_email: string;
  booker_email_confirm: string;
  booker_phone: string;
}

interface Props {
  details: BookerDetails;
  onChange: (updated: BookerDetails) => void;
}

export default function BookerDetailsForm({ details, onChange }: Props) {
  function update(field: keyof BookerDetails, value: string) {
    onChange({ ...details, [field]: value });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          value={details.booker_name}
          onChange={(e) => update('booker_name', e.target.value)}
          placeholder="Your full name"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
        <input
          type="email"
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          value={details.booker_email}
          onChange={(e) => update('booker_email', e.target.value)}
          placeholder="your@email.com"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm email</label>
        <input
          type="email"
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          value={details.booker_email_confirm}
          onChange={(e) => update('booker_email_confirm', e.target.value)}
          placeholder="Confirm email"
          required
        />
        {details.booker_email &&
          details.booker_email_confirm &&
          details.booker_email !== details.booker_email_confirm && (
            <p className="text-red-500 text-xs mt-1">Email addresses do not match</p>
          )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone number <span className="text-gray-700">(optional)</span>
        </label>
        <input
          type="tel"
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          value={details.booker_phone}
          onChange={(e) => update('booker_phone', e.target.value)}
          placeholder="+44..."
        />
      </div>
    </div>
  );
}
