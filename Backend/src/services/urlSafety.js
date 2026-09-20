const dns = require('node:dns').promises;
const ipaddr = require('ipaddr.js');

class UnsafeUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsafeUrlError';
    this.statusCode = 400;
  }
}

function isPublicAddress(address) {
  if (!ipaddr.isValid(address)) return false;

  let parsed = ipaddr.parse(address);
  if (parsed.kind() === 'ipv6' && parsed.isIPv4MappedAddress()) {
    parsed = parsed.toIPv4Address();
  }

  return parsed.range() === 'unicast';
}

function parseHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new UnsafeUrlError('URL is required');
  }

  const trimmedValue = value.trim();
  const hasProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmedValue);
  const normalizedValue = hasProtocol ? trimmedValue : `https://${trimmedValue}`;

  let parsed;
  try {
    parsed = new URL(normalizedValue);
  } catch (error) {
    throw new UnsafeUrlError('Please enter a valid URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new UnsafeUrlError('Only HTTP and HTTPS URLs are allowed');
  }

  if (parsed.username || parsed.password) {
    throw new UnsafeUrlError('URLs containing usernames or passwords are not allowed');
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
  const blockedNames = ['localhost', 'localhost.localdomain'];
  const blockedSuffixes = ['.localhost', '.local', '.internal', '.home', '.lan'];

  if (blockedNames.includes(hostname) || blockedSuffixes.some((suffix) => hostname.endsWith(suffix))) {
    throw new UnsafeUrlError('Private or local network URLs are not allowed');
  }

  return parsed;
}

async function resolvePublicTarget(parsedUrl) {
  const hostname = parsedUrl.hostname;

  if (ipaddr.isValid(hostname)) {
    if (!isPublicAddress(hostname)) {
      throw new UnsafeUrlError('Private, local, or reserved IP addresses are not allowed');
    }

    const parsed = ipaddr.parse(hostname);
    return { address: hostname, family: parsed.kind() === 'ipv6' ? 6 : 4 };
  }

  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch (error) {
    throw new UnsafeUrlError('The hostname could not be resolved');
  }

  if (!addresses.length) {
    throw new UnsafeUrlError('The hostname did not resolve to an IP address');
  }

  if (addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new UnsafeUrlError('The hostname resolves to a private, local, or reserved address');
  }

  return addresses[0];
}

async function validatePublicUrl(value) {
  const parsedUrl = parseHttpUrl(value);
  const target = await resolvePublicTarget(parsedUrl);
  return { parsedUrl, target };
}

module.exports = {
  UnsafeUrlError,
  isPublicAddress,
  parseHttpUrl,
  resolvePublicTarget,
  validatePublicUrl,
};
