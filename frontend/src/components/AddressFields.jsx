import styles from './AddressUi.module.css';

export const PROVINCES = [
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
    'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape',
];

export const EMPTY_ADDRESS = {
    line1: '',
    line2: '',
    suburb: '',
    city: '',
    province: '',
    postalCode: '',
    instructions: '',
    latitude: '',
    longitude: '',
};

export function addressToForm(address) {
    return {
        line1: address?.line1 || '',
        line2: address?.line2 || '',
        suburb: address?.suburb || '',
        city: address?.city || '',
        province: address?.province || '',
        postalCode: address?.postalCode || '',
        instructions: address?.instructions || '',
        latitude: address?.latitude ?? '',
        longitude: address?.longitude ?? '',
    };
}

// The same rules the server applies, so people see the problem before they submit.
export function validateAddress(values) {
    if (!values.line1.trim()) return 'Enter the street address.';
    if (!values.suburb.trim()) return 'Enter the suburb.';
    if (!values.city.trim()) return 'Enter the city or town.';
    if (!values.province) return 'Choose a province.';
    if (!/^\d{4}$/.test(values.postalCode.trim())) return 'Postal code must be 4 digits.';

    const hasLatitude = String(values.latitude).trim() !== '';
    const hasLongitude = String(values.longitude).trim() !== '';

    if (hasLatitude !== hasLongitude) {
        return 'Enter both latitude and longitude, or leave both empty.';
    }

    if (hasLatitude) {
        const latitude = Number(values.latitude);
        const longitude = Number(values.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return 'Latitude and longitude must be numbers.';
        }

        if (latitude < -35 || latitude > -21.5 || longitude < 16 || longitude > 33.5) {
            return 'The map position is outside South Africa. Check that latitude and longitude are not swapped.';
        }
    }

    return null;
}

export function addressPayload(values) {
    const hasPin =
        String(values.latitude).trim() !== '' &&
        String(values.longitude).trim() !== '';

    return {
        line1: values.line1.trim(),
        line2: values.line2.trim() || null,
        suburb: values.suburb.trim(),
        city: values.city.trim(),
        province: values.province,
        postalCode: values.postalCode.trim(),
        latitude: hasPin ? Number(values.latitude) : null,
        longitude: hasPin ? Number(values.longitude) : null,
        instructions: values.instructions.trim() || null,
    };
}

export function formatAddress(address) {
    if (!address) return '';

    return [
        address.line1,
        address.line2,
        address.suburb,
        address.city,
        address.province,
        address.postalCode,
    ].filter(Boolean).join(', ');
}

export default function AddressFields({
    idPrefix,
    values,
    onChange,
    disabled,
    showPin,
    instructionsLabel,
}) {
    const set = (field) => (event) =>
        onChange({ ...values, [field]: event.target.value });

    return (
        <div className={styles.fieldGrid}>
            <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor={`${idPrefix}-line1`}>
                    Street address
                </label>
                <input
                    id={`${idPrefix}-line1`}
                    className={styles.input}
                    value={values.line1}
                    onChange={set('line1')}
                    maxLength={200}
                    placeholder="12 Long Street"
                    disabled={disabled}
                />
            </div>

            <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor={`${idPrefix}-line2`}>
                    Unit, building or complex (optional)
                </label>
                <input
                    id={`${idPrefix}-line2`}
                    className={styles.input}
                    value={values.line2}
                    onChange={set('line2')}
                    maxLength={200}
                    disabled={disabled}
                />
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor={`${idPrefix}-suburb`}>
                    Suburb
                </label>
                <input
                    id={`${idPrefix}-suburb`}
                    className={styles.input}
                    value={values.suburb}
                    onChange={set('suburb')}
                    maxLength={100}
                    disabled={disabled}
                />
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor={`${idPrefix}-city`}>
                    City or town
                </label>
                <input
                    id={`${idPrefix}-city`}
                    className={styles.input}
                    value={values.city}
                    onChange={set('city')}
                    maxLength={100}
                    disabled={disabled}
                />
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor={`${idPrefix}-province`}>
                    Province
                </label>
                <select
                    id={`${idPrefix}-province`}
                    className={styles.select}
                    value={values.province}
                    onChange={set('province')}
                    disabled={disabled}
                >
                    <option value="">Choose a province</option>
                    {PROVINCES.map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor={`${idPrefix}-postal`}>
                    Postal code
                </label>
                <input
                    id={`${idPrefix}-postal`}
                    className={styles.input}
                    value={values.postalCode}
                    onChange={set('postalCode')}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="8001"
                    disabled={disabled}
                />
            </div>

            <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor={`${idPrefix}-notes`}>
                    {instructionsLabel || 'Instructions (optional)'}
                </label>
                <textarea
                    id={`${idPrefix}-notes`}
                    className={styles.textarea}
                    value={values.instructions}
                    onChange={set('instructions')}
                    maxLength={500}
                    disabled={disabled}
                />
            </div>

            {showPin && (
                <details className={styles.pinBox}>
                    <summary>Map position (optional)</summary>

                    <div className={styles.pinGrid}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor={`${idPrefix}-lat`}>
                                Latitude
                            </label>
                            <input
                                id={`${idPrefix}-lat`}
                                className={styles.input}
                                value={values.latitude}
                                onChange={set('latitude')}
                                inputMode="decimal"
                                placeholder="-33.9249"
                                disabled={disabled}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor={`${idPrefix}-lng`}>
                                Longitude
                            </label>
                            <input
                                id={`${idPrefix}-lng`}
                                className={styles.input}
                                value={values.longitude}
                                onChange={set('longitude')}
                                inputMode="decimal"
                                placeholder="18.4241"
                                disabled={disabled}
                            />
                        </div>
                    </div>

                    <p className={styles.hint}>
                        A map to pick the position will come later. For now you
                        can paste coordinates, for example from Google Maps.
                    </p>
                </details>
            )}
        </div>
    );
}