"use client";

import { useEffect, useState } from "react";

export default function FileAuditHistory({ relatedRecordId, relatedRecordType }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && relatedRecordId) {
      fetchAuditLogs();
    }
  }, [isOpen, relatedRecordId]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        relatedRecordId,
        limit: 50,
        skip: 0,
      });

      const response = await fetch(`/api/file-audit?${params}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch audit logs");
      }

      const data = await response.json();
      setLogs(data.data || []);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {isOpen ? "Hide" : "View"} File History
      </button>

      {isOpen && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            File Operation History
          </h3>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-600">
                Loading history...
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && logs.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">
              No file operations recorded yet.
            </div>
          )}

          {!loading && !error && logs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">
                      Date & Time
                    </th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">
                      User
                    </th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">
                      Role
                    </th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">
                      Action
                    </th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">
                      File Name
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 hover:bg-white transition-colors"
                    >
                      <td className="py-2 px-2 text-gray-600 whitespace-nowrap">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleString()
                          : "N/A"}
                      </td>
                      <td className="py-2 px-2 text-gray-900 font-medium">
                        {log.userName || "Unknown"}
                      </td>
                      <td className="py-2 px-2 text-gray-600 text-xs">
                        <span className="inline-block px-2 py-1 bg-gray-200 text-gray-800 rounded">
                          {log.userRole || "N/A"}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                            log.action === "upload"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {log.action === "upload" ? "📤 Upload" : "🔄 Update"}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-600 truncate">
                        {log.originalFileName || log.fileName || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
