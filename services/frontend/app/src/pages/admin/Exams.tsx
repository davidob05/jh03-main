import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import InputBase from '@mui/material/InputBase';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { visuallyHidden } from '@mui/utils';
import { Link as MUILink } from '@mui/material';
import { Link } from 'react-router-dom';
import { apiBaseUrl } from '../utils/api';
import { LineWeight } from '@mui/icons-material';

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


// Helper function to format datetime for display
function formatDateTime(dateTime: string): string {
  if (!dateTime) return 'N/A';
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function calculateDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return 'N/A';
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'N/A';
  }
  const diffMs = end.getTime() - start.getTime();

  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return 'N/A';
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const parts = [];

  if (hours) {
    parts.push(`${hours}h`);
  }

  if (minutes) {
    parts.push(`${minutes}m`);
  }

  return parts.length ? parts.join(' ') : '0m';
}

const fetchExams = async (): Promise<ExamData[]> => {
  const response = await fetch(apiBaseUrl + "/exams/");
  if (!response.ok) throw new Error('Unable to load exams');
  return response.json();
};

const getPrimaryExamVenue = (exam: ExamData): ExamVenueData | undefined => {
  const venues = exam.exam_venues || [];
  return venues.find((venue) => venue.core) || venues[0];
};

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

type Order = 'asc' | 'desc';

function getComparator<Key extends keyof RowData>(
  order: Order,
  orderBy: Key,
): ((a: RowData, b: RowData) => number) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

interface HeadCell {
  disablePadding: boolean;
  id: keyof RowData;
  label: string;
  numeric: boolean;
}

interface RowData {
  id: number;
  code: string;
  subject: string;
  venues: string;
  startTime: string;
  endTime: string;
}

const headCells: readonly HeadCell[] = [
  {
    id: 'code',
    numeric: false,
    disablePadding: true,
    label: 'Exam Code',
  },
  {
    id: 'subject',
    numeric: false,
    disablePadding: false,
    label: 'Subject',
  },
  {
    id: 'venues',
    numeric: false,
    disablePadding: false,
    label: 'Venues',
  },
  {
    id: 'startTime',
    numeric: false,
    disablePadding: false,
    label: 'Start Time',
  },
];

interface EnhancedTableProps {
  numSelected: number;
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof RowData) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  order: Order;
  orderBy: keyof RowData;
  rowCount: number;
}

function EnhancedTableHead(props: EnhancedTableProps) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } =
    props;
  const createSortHandler =
    (property: keyof RowData) => (event: React.MouseEvent<unknown>) => {
      onRequestSort(event, property);
    };

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            color="primary"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{
              'aria-label': 'select all exams',
            }}
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
        <TableCell align="left">Duration</TableCell>
      </TableRow>
    </TableHead>
  );
}

interface EnhancedTableToolbarProps {
  numSelected: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
}

function EnhancedTableToolbar(props: EnhancedTableToolbarProps) {
  const { numSelected, searchQuery, onSearchChange, sortBy } = props;

  return (
    <Toolbar
      sx={[
        {
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
        },
        numSelected > 0 && {
          bgcolor: (theme) =>
            alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
        },
      ]}
    >
      {numSelected > 0 ? (
        <Typography
          sx={{ flex: '1 1 100%' }}
          color="inherit"
          variant="subtitle1"
          component="div"
        >
          {numSelected} selected
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: '1 1 100%' }}>
          <Typography
            variant="h6"
            id="tableTitle"
            component="div"
          >
            Exams
          </Typography>
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
              placeholder="Search exams..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              sx={{ width: 250 }}
            />
          </Box>
        </Box>
      )}
      {numSelected > 0 ? (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {numSelected === 1 ? (
            <Tooltip title="Edit">
              <IconButton>
                <EditIcon />
              </IconButton>
            </Tooltip>
          ) : null}
          <Tooltip title="Delete">
            <IconButton>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ) : null}
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
  const [sortBy, setSortBy] = React.useState('code');

  const {
    data: examsData = [],
    isLoading,
    isError,
    error,
  } = useQuery<ExamData[], Error>({
    queryKey: ['exams'],
    queryFn: fetchExams,
  });


  const rows = React.useMemo<RowData[]>(() => {
    return examsData.map((exam) => ({
      id: exam.exam_id,
      code: exam.course_code,
      subject: exam.exam_name,
      venues: (exam.venues || []).join(', '),
      startTime: getPrimaryExamVenue(exam)?.start_time || '',
      endTime: (() => {
        const venue = getPrimaryExamVenue(exam);
        if (!venue?.start_time || venue.exam_length == null) {
          return '';
        }
        const start = new Date(venue.start_time);
        if (Number.isNaN(start.getTime())) {
          return '';
        }
        return new Date(start.getTime() + venue.exam_length * 60000).toISOString();
      })(),
    }));
  }, [examsData]);

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = rows.map((n) => n.id);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleRequestSort = (
    event: React.MouseEvent<unknown>,
    property: keyof RowData,
  ) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };


  const handleClick = (event: React.MouseEvent<unknown>, id: number) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: readonly number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }
    setSelected(newSelected);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(0);
  };

  const filteredRows = React.useMemo(() => {
    if (!searchQuery) return rows;

    const lowerQuery = searchQuery.toLowerCase();
    return rows.filter(
      (row) =>
        row.code.toLowerCase().includes(lowerQuery) ||
        row.subject.toLowerCase().includes(lowerQuery) ||
        row.venues.toLowerCase().includes(lowerQuery) ||
        formatDateTime(row.startTime).toLowerCase().includes(lowerQuery) ||
        formatDateTime(row.endTime).toLowerCase().includes(lowerQuery)
    );
  }, [rows, searchQuery]);
  

  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredRows.length) : 0;

  const visibleRows = React.useMemo(
    () =>
      [...filteredRows]
        .sort(getComparator(order, orderBy))
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [order, orderBy, page, rowsPerPage, filteredRows],
  );

  if (isLoading) {
    return (
      <Box sx={{ width: '100%', maxWidth: 1050, p: 3, mx: 'auto' }}>
        <Paper sx={{ width: '100%', p: 4, textAlign: 'center' }}>
          <Typography variant="h6">Loading exams...</Typography>
        </Paper>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ width: '100%', maxWidth: 1050, p: 3, mx: 'auto' }}>
        <Paper sx={{ width: '100%', p: 4, textAlign: 'center' }}>
          <Typography color="error" variant="h6">
            {error?.message || 'Failed to load exams'}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 1050, p: 3, mx: "auto" }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <EnhancedTableToolbar
          numSelected={selected.length}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          sortBy={sortBy}
        />
        <TableContainer>
          <Table
            sx={{ minWidth: 750 }}
            aria-labelledby="tableTitle"
            size="medium"
          >
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

                return (
                  <TableRow
                    hover
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={row.id}
                    selected={isItemSelected}
                    sx={{
                      '&:hover .hover-bold': { fontWeight: 'bold' },
                    }}
                  >                    
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        onClick={(event) => handleClick(event, row.id)}
                        inputProps={{
                          'aria-labelledby': labelId,
                        }}
                      />
                    </TableCell>
                    <TableCell
                      component="th"
                      id={labelId}
                      scope="row"
                      padding="none"
                    >
                      <Link to={`/exams/${row.code}`}><MUILink style={{ cursor: 'pointer' }}>{row.code}</MUILink></Link>
                    </TableCell>
                    <TableCell className='hover-bold'>{row.subject}</TableCell>
                    <TableCell>{row.venues}</TableCell>
                    <TableCell>{formatDateTime(row.startTime)}</TableCell>
                    <TableCell>{formatDateTime(row.endTime)}</TableCell>
                    <TableCell>{calculateDuration(row.startTime, row.endTime)}</TableCell>
                  </TableRow>
                );
              })}
              {emptyRows > 0 && (
                <TableRow
                  style={{
                    height: 53 * emptyRows,
                  }}
                >
                  <TableCell colSpan={8} />
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
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
}
