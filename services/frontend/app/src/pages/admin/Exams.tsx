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
  Link as MUILink,
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import { Delete as DeleteIcon, Edit as EditIcon, ExpandMore as ExpandMoreIcon, Search as SearchIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { apiBaseUrl } from '../../utils/api';

interface ExamData {
  exam_id: number;
  exam_name: string;
  course_code: string;
  no_students: number;
  exam_school: string;
  school_contact: string;
  venues: string[];
  exam_venues: ExamVenueData[];
}

interface ExamVenueData {
  examvenue_id: number;
  venue_name: string;
  start_time: string | null;
  exam_length: number | null;
  core: boolean;
  provision_capabilities: string[];
}

interface RowData {
  id: number;
  code: string;
  subject: string;
  coreVenue: string;
  startTime: string;
  endTime: string;
  duration: string;
  otherVenues: OtherVenueRow[];
  searchIndex: string;
}

interface OtherVenueRow {
  id: number;
  venue: string;
  startTime: string;
  endTime: string;
  duration: string;
}

type Order = 'asc' | 'desc';

interface HeadCell {
  disablePadding: boolean;
  id: keyof RowData;
  label: string;
  numeric: boolean;
}

const headCells: readonly HeadCell[] = [
  { id: 'code', numeric: false, disablePadding: true, label: 'Exam Code' },
  { id: 'subject', numeric: false, disablePadding: false, label: 'Subject' },
  { id: 'coreVenue', numeric: false, disablePadding: false, label: 'Venue' },
  { id: 'startTime', numeric: false, disablePadding: false, label: 'Start Time' },
  { id: 'endTime', numeric: false, disablePadding: false, label: 'End Time' },
];

const fetchExams = async (): Promise<ExamData[]> => {
  const response = await fetch(`${apiBaseUrl}/exams/`);
  if (!response.ok) throw new Error('Unable to load exams');
  return response.json();
};

const getPrimaryExamVenue = (exam: ExamData): ExamVenueData | undefined => {
  return exam.exam_venues.find((v) => v.core) || exam.exam_venues[0];
};

function formatDateTime(dateTime: string): string {
  if (!dateTime) return 'N/A';
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function calculateDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return 'N/A';
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'N/A';
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 'N/A';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return [hours ? `${hours}h` : '', minutes ? `${minutes}m` : ''].filter(Boolean).join(' ') || '0m';
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}

function getComparator<Key extends keyof RowData>(order: Order, orderBy: Key) {
  return order === 'desc'
    ? (a: RowData, b: RowData) => descendingComparator(a, b, orderBy)
    : (a: RowData, b: RowData) => -descendingComparator(a, b, orderBy);
}

interface EnhancedTableProps {
  numSelected: number;
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof RowData) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  order: Order;
  orderBy: keyof RowData;
  rowCount: number;
}

function EnhancedTableHead(props: EnhancedTableProps) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } = props;
  const createSortHandler = (property: keyof RowData) => (event: React.MouseEvent<unknown>) => onRequestSort(event, property);

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            color="primary"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{ 'aria-label': 'select all exams' }}
          />
        </TableCell>
        {headCells.map((headCell) => (
          <TableCell key={headCell.id} align={headCell.numeric ? 'right' : 'left'} padding={headCell.disablePadding ? 'none' : 'normal'} sortDirection={orderBy === headCell.id ? order : false}>
            <TableSortLabel active={orderBy === headCell.id} direction={orderBy === headCell.id ? order : 'asc'} onClick={createSortHandler(headCell.id)}>
              {headCell.label}
              {orderBy === headCell.id && <Box component="span" sx={visuallyHidden}>{order === 'desc' ? 'sorted descending' : 'sorted ascending'}</Box>}
            </TableSortLabel>
          </TableCell>
        ))}
        <TableCell align="left">Duration</TableCell>
        <TableCell align="center">Details</TableCell>
      </TableRow>
    </TableHead>
  );
}

interface EnhancedTableToolbarProps {
  numSelected: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function EnhancedTableToolbar({ numSelected, searchQuery, onSearchChange }: EnhancedTableToolbarProps) {
  return (
    <Toolbar sx={[{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 } }, numSelected > 0 && { bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity) }]}>
      {numSelected > 0 ? (
        <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle1" component="div">
          {numSelected} selected
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: '1 1 100%' }}>
          <Typography variant="h6" id="tableTitle" component="div">Exams</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: 'action.hover', borderRadius: 1, px: 2, py: 0.5 }}>
            <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
            <InputBase placeholder="Search exams..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} sx={{ width: 250 }} />
          </Box>
        </Box>
      )}
      {numSelected > 0 && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {numSelected === 1 && (
            <Tooltip title="Edit">
              <IconButton><EditIcon /></IconButton>
            </Tooltip>
          )}
          <Tooltip title="Delete">
            <IconButton><DeleteIcon /></IconButton>
          </Tooltip>
        </Box>
      )}
    </Toolbar>
  );
}

export const AdminExams: React.FC = () => {
  const [order, setOrder] = React.useState<Order>('asc');
  const [orderBy, setOrderBy] = React.useState<keyof RowData>('code');
  const [selected, setSelected] = React.useState<readonly number[]>([]);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [openRows, setOpenRows] = React.useState<Record<number, boolean>>({});

  const { data: examsData = [], isLoading, isError, error } = useQuery<ExamData[], Error>({ queryKey: ['exams'], queryFn: fetchExams });

  const rows = React.useMemo<RowData[]>(() => examsData.map((exam) => {
    const coreVenue = getPrimaryExamVenue(exam);
    const otherVenues = (exam.exam_venues || []).filter((v) => !coreVenue || v.examvenue_id !== coreVenue.examvenue_id);
    const coreEndTime = coreVenue?.start_time && coreVenue.exam_length != null
      ? new Date(new Date(coreVenue.start_time).getTime() + coreVenue.exam_length * 60000).toISOString()
      : '';

    return {
      id: exam.exam_id,
      code: exam.course_code,
      subject: exam.exam_name,
      coreVenue: coreVenue?.venue_name || '—',
      startTime: coreVenue?.start_time || '',
      endTime: coreEndTime,
      duration: calculateDuration(coreVenue?.start_time || '', coreEndTime),
      otherVenues: otherVenues.map((venue) => {
        const endTime = venue.start_time && venue.exam_length != null
          ? new Date(new Date(venue.start_time).getTime() + venue.exam_length * 60000).toISOString()
          : '';
        return { id: venue.examvenue_id, venue: venue.venue_name, startTime: venue.start_time || '', endTime, duration: calculateDuration(venue.start_time || '', endTime) };
      }),
      searchIndex: [exam.course_code, exam.exam_name, coreVenue?.venue_name || '', ...otherVenues.map((v) => v.venue_name)].join(' ').toLowerCase(),
    };
  }), [examsData]);

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(event.target.checked ? rows.map((n) => n.id) : []);
  };

  const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof RowData) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleClick = (event: React.MouseEvent<unknown>, id: number) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: readonly number[] = [];
    if (selectedIndex === -1) newSelected = newSelected.concat(selected, id);
    else if (selectedIndex === 0) newSelected = newSelected.concat(selected.slice(1));
    else if (selectedIndex === selected.length - 1) newSelected = newSelected.concat(selected.slice(0, -1));
    else if (selectedIndex > 0) newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
    setSelected(newSelected);
  };

  const handleChangePage = (event: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };
  const handleSearchChange = (query: string) => { setSearchQuery(query); setPage(0); };

  const filteredRows = React.useMemo(() => {
    if (!searchQuery) return rows;
    const lowerQuery = searchQuery.toLowerCase();
    return rows.filter((row) =>
      row.code.toLowerCase().includes(lowerQuery) ||
      row.subject.toLowerCase().includes(lowerQuery) ||
      row.coreVenue.toLowerCase().includes(lowerQuery) ||
      row.searchIndex.includes(lowerQuery) ||
      formatDateTime(row.startTime).toLowerCase().includes(lowerQuery) ||
      formatDateTime(row.endTime).toLowerCase().includes(lowerQuery)
    );
  }, [rows, searchQuery]);

  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredRows.length) : 0;
  const visibleRows = React.useMemo(() => [...filteredRows].sort(getComparator(order, orderBy)).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [order, orderBy, page, rowsPerPage, filteredRows]);

  if (isLoading) return <Box sx={{ width: '100%', maxWidth: 1050, p: 3, mx: 'auto' }}><Paper sx={{ width: '100%', p: 4, textAlign: 'center' }}><Typography variant="h6">Loading exams...</Typography></Paper></Box>;
  if (isError) return <Box sx={{ width: '100%', maxWidth: 1050, p: 3, mx: 'auto' }}><Paper sx={{ width: '100%', p: 4, textAlign: 'center' }}><Typography color="error" variant="h6">{error?.message || 'Failed to load exams'}</Typography></Paper></Box>;

  return (
    <Box sx={{ width: '100%', maxWidth: 1050, p: 3, mx: 'auto' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <EnhancedTableToolbar numSelected={selected.length} searchQuery={searchQuery} onSearchChange={handleSearchChange} />
        <TableContainer>
          <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle" size="medium">
            <EnhancedTableHead numSelected={selected.length} order={order} orderBy={orderBy} onSelectAllClick={handleSelectAllClick} onRequestSort={handleRequestSort} rowCount={filteredRows.length} />
            <TableBody>
              {visibleRows.map((row, index) => {
                const isItemSelected = selected.includes(row.id);
                const labelId = `enhanced-table-checkbox-${index}`;
                const isOpen = openRows[row.id] || false;
                return (
                  <React.Fragment key={row.id}>
                    <TableRow hover role="checkbox" aria-checked={isItemSelected} tabIndex={-1} selected={isItemSelected}>
                      <TableCell padding="checkbox">
                        <Checkbox color="primary" checked={isItemSelected} onClick={(event) => handleClick(event, row.id)} inputProps={{ 'aria-labelledby': labelId }} />
                      </TableCell>
                      <TableCell component="th" id={labelId} scope="row" padding="none">
                        <Link to={`/exams/${row.code}`}><MUILink style={{ cursor: 'pointer' }}>{row.code}</MUILink></Link>
                      </TableCell>
                      <TableCell>{row.subject}</TableCell>
                      <TableCell>{row.coreVenue}</TableCell>
                      <TableCell>{formatDateTime(row.startTime)}</TableCell>
                      <TableCell>{formatDateTime(row.endTime)}</TableCell>
                      <TableCell>{row.duration}</TableCell>
                      <TableCell align="center">
                        <IconButton aria-label={isOpen ? 'Collapse exam venues' : 'Expand exam venues'} onClick={() => setOpenRows((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}>
                          <ExpandMoreIcon sx={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={headCells.length + 3}>
                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>Other venues for this exam</Typography>
                            {row.otherVenues.length ? (
                              <Table size="small" aria-label="other venues">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Venue</TableCell>
                                    <TableCell>Start</TableCell>
                                    <TableCell>End</TableCell>
                                    <TableCell>Duration</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {row.otherVenues.map((venue) => (
                                    <TableRow key={venue.id}>
                                      <TableCell>{venue.venue}</TableCell>
                                      <TableCell>{formatDateTime(venue.startTime)}</TableCell>
                                      <TableCell>{formatDateTime(venue.endTime)}</TableCell>
                                      <TableCell>{venue.duration}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : <Typography variant="body2" color="text.secondary">No additional venues for this exam.</Typography>}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
              {emptyRows > 0 && <TableRow style={{ height: 53 * emptyRows }}><TableCell colSpan={8} /></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredRows.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} />
      </Paper>
    </Box>
  );
};