import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Toolbar,
  Typography,
  Collapse,
  Paper,
  Checkbox,
  IconButton,
  Tooltip,
  InputBase,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, ExpandMore as ExpandMoreIcon, Search as SearchIcon } from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';
import { Link as MUILink } from '@mui/material';
import { Link } from 'react-router-dom';

import { apiBaseUrl } from '../../utils/api';

interface ExamVenueData {
  exam_name: string;
  start_time: string | null;
  exam_length: number | null;
}

interface VenueData {
  venue_name: string;
  capacity: number;
  venuetype: string;
  is_accessible: boolean;
  qualifications: string[];
  availability: unknown[];
  provision_capabilities: string[];
  exam_venues: ExamVenueData[];
}

interface VenueExamDetail {
  name: string;
  start: string;
  end: string;
  duration: string;
}

interface RowData {
  id: string;
  name: string;
  capacity: number;
  type: string;
  accessibility: string;
  provisionCapabilities: string;
  examDetails: VenueExamDetail[];
  examSearch: string;
}

type Order = 'asc' | 'desc';

interface HeadCell {
  disablePadding: boolean;
  id: keyof RowData;
  label: string;
  numeric: boolean;
}

const headCells: readonly HeadCell[] = [
  { id: 'name', numeric: false, disablePadding: true, label: 'Venue' },
  { id: 'capacity', numeric: true, disablePadding: false, label: 'Capacity' },
  { id: 'type', numeric: false, disablePadding: false, label: 'Type' },
  { id: 'accessibility', numeric: false, disablePadding: false, label: 'Accessible' },
  { id: 'provisionCapabilities', numeric: false, disablePadding: false, label: 'Provisions' },
];

const fetchVenues = async (): Promise<VenueData[]> => {
  const response = await fetch(apiBaseUrl + "/venues/");
  if (!response.ok) throw new Error('Unable to load venues');
  return response.json();
};

const formatLabel = (text?: string): string => {
  if (!text) return 'Unknown';
  const spaced = text.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const formatDateTime = (dateTime?: string): string => {
  if (!dateTime) return 'N/A';
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDurationFromLength = (length: number | null | undefined): string => {
  if (length == null) return 'N/A';
  const hours = Math.floor(length / 60);
  const minutes = Math.round(length % 60);
  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  return parts.join(' ') || '0m';
};

const calculateEndTime = (start: string | null, length: number | null): string => {
  if (!start || length == null) return '';
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return '';
  const end = new Date(startDate.getTime() + length * 60000);
  return end.toISOString();
};

const descendingComparator = <T,>(a: T, b: T, orderBy: keyof T) => {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
};

const getComparator = <Key extends keyof RowData>(
  order: Order,
  orderBy: Key,
): ((a: RowData, b: RowData) => number) =>
  order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);

interface EnhancedTableProps {
  numSelected: number;
  onRequestSort: (e: React.MouseEvent<unknown>, p: keyof RowData) => void;
  onSelectAllClick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  order: Order;
  orderBy: keyof RowData;
  rowCount: number;
}

const EnhancedTableHead = ({
  numSelected,
  onRequestSort,
  onSelectAllClick,
  order,
  orderBy,
  rowCount,
}: EnhancedTableProps) => {
  const createSortHandler =
    (property: keyof RowData) => (event: React.MouseEvent<unknown>) =>
      onRequestSort(event, property);

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            color="primary"
            checked={rowCount > 0 && numSelected === rowCount}
            indeterminate={numSelected > 0 && numSelected < rowCount}
            onChange={onSelectAllClick}
          />
        </TableCell>

        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}

        <TableCell align="center">Details</TableCell>
      </TableRow>
    </TableHead>
  );
};

interface EnhancedTableToolbarProps {
  numSelected: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const EnhancedTableToolbar = ({ numSelected, searchQuery, onSearchChange }: EnhancedTableToolbarProps) => {
  return (
    <Toolbar
      sx={[
        { pl: { sm: 2 }, pr: { xs: 1, sm: 1 } },
        numSelected > 0 && {
          bgcolor: (theme) =>
            alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
        },
      ]}
    >
      {numSelected > 0 ? (
        <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle1">
          {numSelected} selected
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: '1 1 100%' }}>
          <Typography variant="h6">Venues</Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'action.hover',
              borderRadius: 1,
              px: 2,
              py: 0.5,
            }}
          >
            <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
            <InputBase
              placeholder="Search venues…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              sx={{ width: 250 }}
            />
          </Box>
        </Box>
      )}

      {numSelected > 0 && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {numSelected === 1 && (
            <Tooltip title="Edit">
              <IconButton>
                <EditIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Delete">
            <IconButton>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Toolbar>
  );
};

export const AdminVenues: React.FC = () => {
  const [order, setOrder] = React.useState<Order>('asc');
  const [orderBy, setOrderBy] = React.useState<keyof RowData>('name');
  const [selected, setSelected] = React.useState<readonly string[]>([]);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [openRows, setOpenRows] = React.useState<Record<string, boolean>>({});

  const {
    data: venuesData = [],
    isLoading,
    isError,
    error,
  } = useQuery<VenueData[], Error>({
    queryKey: ['venues'],
    queryFn: fetchVenues,
  });

  const rows = React.useMemo<RowData[]>(
    () =>
      venuesData.map((venue) => ({
        id: venue.venue_name,
        name: venue.venue_name,
        capacity: venue.capacity,
        type: formatLabel(venue.venuetype),
        accessibility: venue.is_accessible ? 'Yes' : 'No',
        provisionCapabilities: (venue.provision_capabilities || []).join(', '),
        examDetails: (venue.exam_venues || []).map((ex) => ({
          name: ex.exam_name,
          start: ex.start_time || '',
          end: calculateEndTime(ex.start_time, ex.exam_length),
          duration: formatDurationFromLength(ex.exam_length),
        })),
        examSearch: (venue.exam_venues || []).map((ev) => ev.exam_name).join(', '),
      })),
    [venuesData],
  );

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(rows.map((n) => n.id));
      return;
    }
    setSelected([]);
  };

  const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof RowData) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleClick = (event: React.MouseEvent<unknown>, id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: readonly string[] = [];

    if (selectedIndex === -1) newSelected = newSelected.concat(selected, id);
    else if (selectedIndex === 0) newSelected = newSelected.concat(selected.slice(1));
    else if (selectedIndex === selected.length - 1)
      newSelected = newSelected.concat(selected.slice(0, -1));
    else if (selectedIndex > 0)
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );

    setSelected(newSelected);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setPage(0);
  };

  const filteredRows = React.useMemo(() => {
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();

    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q) ||
        row.accessibility.toLowerCase().includes(q) ||
        row.examSearch.toLowerCase().includes(q) ||
        row.provisionCapabilities.toLowerCase().includes(q) ||
        row.capacity.toString().includes(q),
    );
  }, [rows, searchQuery]);

  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredRows.length) : 0;

  const visibleRows = React.useMemo(
    () =>
      [...filteredRows]
        .sort(getComparator(order, orderBy))
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [order, orderBy, page, rowsPerPage, filteredRows],
  );

  if (isLoading)
    return (
      <Box sx={{ width: '100%', maxWidth: 1050, mx: 'auto', p: 3 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">Loading venues…</Typography>
        </Paper>
      </Box>
    );

  if (isError)
    return (
      <Box sx={{ width: '100%', maxWidth: 1050, mx: 'auto', p: 3 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="error" variant="h6">
            {error?.message || 'Failed to load venues'}
          </Typography>
        </Paper>
      </Box>
    );

  return (
    <Box sx={{ width: '100%', maxWidth: 1050, mx: 'auto', p: 3 }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <EnhancedTableToolbar
          numSelected={selected.length}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />

        <TableContainer>
          <Table sx={{ minWidth: 750 }} size="medium">
            <EnhancedTableHead
              numSelected={selected.length}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={handleSelectAllClick}
              onRequestSort={handleRequestSort}
              rowCount={filteredRows.length}
            />

            <TableBody>
              {visibleRows.map((row, index) => {
                const isItemSelected = selected.includes(row.id);
                const labelId = `enhanced-table-checkbox-${index}`;
                const isOpen = openRows[row.id] || false;

                return (
                  <React.Fragment key={row.id}>
                    <TableRow hover role="checkbox" aria-checked={isItemSelected} selected={isItemSelected}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          onClick={(event) => handleClick(event, row.id)}
                          inputProps={{ 'aria-labelledby': labelId }}
                        />
                      </TableCell>

                      <TableCell id={labelId} component="th" scope="row" padding="none">
                        <Link to={`/venues/${row.id}`}>
                          <MUILink sx={{ cursor: 'pointer' }}>{row.name}</MUILink>
                        </Link>
                      </TableCell>

                      <TableCell align="right">{row.capacity}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>{row.accessibility}</TableCell>
                      <TableCell>{row.provisionCapabilities || '—'}</TableCell>

                      <TableCell align="center">
                        <IconButton
                          onClick={() =>
                            setOpenRows((prev) => ({
                              ...prev,
                              [row.id]: !prev[row.id],
                            }))
                          }
                        >
                          <ExpandMoreIcon
                            sx={{
                              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                            }}
                          />
                        </IconButton>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell colSpan={headCells.length + 2} sx={{ py: 0 }}>
                        <Collapse in={isOpen} unmountOnExit>
                          <Box sx={{ m: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                              Exams in this venue
                            </Typography>

                            {row.examDetails.length > 0 ? (
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Exam</TableCell>
                                    <TableCell>Start</TableCell>
                                    <TableCell>End</TableCell>
                                    <TableCell>Duration</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {row.examDetails.map((exam) => (
                                    <TableRow key={`${row.id}-${exam.name}-${exam.start}`}>
                                      <TableCell>{exam.name}</TableCell>
                                      <TableCell>{formatDateTime(exam.start)}</TableCell>
                                      <TableCell>{formatDateTime(exam.end)}</TableCell>
                                      <TableCell>{exam.duration}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No exams scheduled for this venue.
                              </Typography>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}

              {emptyRows > 0 && (
                <TableRow style={{ height: 53 * emptyRows }}>
                  <TableCell colSpan={headCells.length + 2} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>
    </Box>
  );
};